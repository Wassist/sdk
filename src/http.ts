/**
 * Low-level HTTP transport used by every resource module.
 *
 * Wraps `fetch` with:
 *   - `X-API-Key` authentication
 *   - `/api/v1/` path prefix handling
 *   - Per-request timeout (cancels via `AbortController`)
 *   - Exponential-backoff retries on `429` and `5xx` (honors `Retry-After`)
 *   - `Idempotency-Key` opt-in for safe `POST` retries
 *   - Typed error mapping via {@link errorFromResponse}
 *   - `requestId` extraction from the `X-Request-Id` response header
 */

import {
  WassistConnectionError,
  WassistError,
  WassistRateLimitError,
  WassistTimeoutError,
  errorFromResponse,
} from './errors';
import type { RequestOptions } from './types/common';
import { SDK_VERSION } from './version';

/**
 * The minimal `fetch` signature this SDK depends on. Any spec-compliant
 * implementation will satisfy it — Node 18+, edge runtimes, browsers, Bun.
 */
export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

/**
 * Configuration for {@link Wassist}.
 */
export interface WassistClientConfig {
  /**
   * Your Wassist API key. Find it at
   * https://wassist.app/settings → API Keys.
   */
  apiKey: string;
  /**
   * Base URL of the Wassist API.
   *
   * @default 'https://backend.wassist.app'
   */
  baseUrl?: string;
  /**
   * Default request timeout in milliseconds. Individual calls can override
   * via the per-call `timeout` option.
   *
   * @default 60_000
   */
  timeout?: number;
  /**
   * Maximum number of retry attempts on `429` / `5xx` / network errors.
   * The total number of requests is `maxRetries + 1`.
   *
   * @default 2
   */
  maxRetries?: number;
  /**
   * Custom `fetch` implementation. Useful for tests, mocking, or runtimes
   * that don't expose `globalThis.fetch`.
   *
   * @default globalThis.fetch
   */
  fetch?: FetchLike;
}

const DEFAULT_BASE_URL = 'https://backend.wassist.app';
const DEFAULT_TIMEOUT_MS = 60_000;
const DEFAULT_MAX_RETRIES = 2;
const API_VERSION_PREFIX = '/api/v1';
const RETRY_STATUSES: ReadonlySet<number> = new Set([408, 425, 429, 500, 502, 503, 504]);

/** Query-string values supported on every request. */
export type QueryValue = string | number | boolean | undefined | null;

/** A loose-record shape for query strings — every field is optional and stringly-typed. */
export type QueryParams = { readonly [key: string]: QueryValue };

interface RequestArgs {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
  query?: object;
  body?: unknown;
  options?: RequestOptions;
}

/**
 * @internal
 */
export class HttpClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly timeout: number;
  private readonly maxRetries: number;
  private readonly fetchImpl: FetchLike;

  constructor(config: WassistClientConfig) {
    if (!config.apiKey) {
      throw new WassistError({
        message:
          'A Wassist `apiKey` is required. Create one at https://wassist.app/settings.',
      });
    }
    this.apiKey = config.apiKey;
    this.baseUrl = (config.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, '');
    this.timeout = config.timeout ?? DEFAULT_TIMEOUT_MS;
    this.maxRetries = config.maxRetries ?? DEFAULT_MAX_RETRIES;
    const provided = config.fetch ?? globalThis.fetch?.bind(globalThis);
    if (!provided) {
      throw new WassistError({
        message:
          'No `fetch` implementation found. Pass one via `fetch` in the Wassist constructor, or run on Node 18+ / a runtime with a global `fetch`.',
      });
    }
    this.fetchImpl = provided;
  }

  get<T>(path: string, args?: Omit<RequestArgs, 'method' | 'path' | 'body'>): Promise<T> {
    return this.request<T>({ ...args, method: 'GET', path });
  }
  post<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>({ method: 'POST', path, body, options });
  }
  put<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>({ method: 'PUT', path, body, options });
  }
  patch<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>({ method: 'PATCH', path, body, options });
  }
  delete<T>(path: string, options?: RequestOptions): Promise<T> {
    return this.request<T>({ method: 'DELETE', path, options });
  }

  private async request<T>(args: RequestArgs): Promise<T> {
    const url = this.buildUrl(args.path, args.query);
    const headers = this.buildHeaders(args);
    const body = args.body === undefined ? undefined : JSON.stringify(args.body);
    const maxRetries = args.options?.maxRetries ?? this.maxRetries;
    const timeout = args.options?.timeout ?? this.timeout;

    let lastError: unknown;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const response = await this.doFetch({
          url,
          method: args.method,
          headers,
          body,
          timeout,
          signal: args.options?.signal,
        });

        if (response.ok) {
          if (response.status === 204) return undefined as T;
          // Some endpoints return empty bodies — handle gracefully.
          const text = await response.text();
          if (!text) return undefined as T;
          return JSON.parse(text) as T;
        }

        // Build a typed error and decide whether to retry.
        const requestId = response.headers.get('x-request-id') ?? undefined;
        const retryAfter = parseRetryAfter(response.headers.get('retry-after'));
        const parsedBody = await safeJson(response);
        const apiError = errorFromResponse({
          status: response.status,
          body: parsedBody,
          requestId,
          retryAfter,
        });

        const isRetryable = RETRY_STATUSES.has(response.status);
        if (isRetryable && attempt < maxRetries) {
          await sleep(computeBackoff(attempt, apiError));
          lastError = apiError;
          continue;
        }
        throw apiError;
      } catch (err) {
        if (err instanceof WassistError) {
          // Already a typed SDK error from the branch above.
          if (
            attempt < maxRetries &&
            (err instanceof WassistRateLimitError || isRetryableApiError(err))
          ) {
            await sleep(computeBackoff(attempt, err));
            lastError = err;
            continue;
          }
          throw err;
        }

        // Map fetch-level failures.
        const mapped = mapFetchError(err);
        if (attempt < maxRetries && isRetryableTransport(mapped)) {
          await sleep(computeBackoff(attempt));
          lastError = mapped;
          continue;
        }
        throw mapped;
      }
    }
    // Should be unreachable — every path above either returns or throws.
    throw lastError instanceof Error
      ? lastError
      : new WassistError({ message: 'Wassist request failed after retries.' });
  }

  private buildUrl(path: string, query?: object): string {
    const prefixedPath = path.startsWith('/') ? path : `/${path}`;
    const fullPath = prefixedPath.startsWith(API_VERSION_PREFIX)
      ? prefixedPath
      : `${API_VERSION_PREFIX}${prefixedPath}`;
    const url = new URL(this.baseUrl + fullPath);
    if (query) {
      for (const [key, value] of Object.entries(query as Record<string, QueryValue>)) {
        if (value === undefined || value === null) continue;
        url.searchParams.append(key, String(value));
      }
    }
    return url.toString();
  }

  private buildHeaders(args: RequestArgs): Record<string, string> {
    const headers: Record<string, string> = {
      'X-API-Key': this.apiKey,
      'Accept': 'application/json',
      'User-Agent': `wassist-sdk-node/${SDK_VERSION}`,
      'X-Wassist-Client': `wassist-sdk-node/${SDK_VERSION}`,
    };
    if (args.body !== undefined) headers['Content-Type'] = 'application/json';
    if (args.options?.idempotencyKey) {
      headers['Idempotency-Key'] = args.options.idempotencyKey;
    }
    if (args.options?.headers) {
      for (const [k, v] of Object.entries(args.options.headers)) headers[k] = v;
    }
    return headers;
  }

  private async doFetch(args: {
    url: string;
    method: string;
    headers: Record<string, string>;
    body?: string;
    timeout: number;
    signal?: AbortSignal;
  }): Promise<Response> {
    const controller = new AbortController();
    const onAbort = () => controller.abort();
    if (args.signal) {
      if (args.signal.aborted) controller.abort();
      else args.signal.addEventListener('abort', onAbort, { once: true });
    }
    const timeoutId = setTimeout(() => controller.abort(), args.timeout);
    try {
      return await this.fetchImpl(args.url, {
        method: args.method,
        headers: args.headers,
        body: args.body,
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
      if (args.signal) args.signal.removeEventListener('abort', onAbort);
    }
  }
}

// =============================================================================
// Helpers
// =============================================================================

function safeJson(response: Response): Promise<unknown> {
  return response
    .text()
    .then((text) => {
      if (!text) return undefined;
      try {
        return JSON.parse(text);
      } catch {
        return text;
      }
    })
    .catch(() => undefined);
}

function parseRetryAfter(value: string | null): number | undefined {
  if (!value) return undefined;
  const asNum = Number(value);
  if (Number.isFinite(asNum) && asNum >= 0) return asNum;
  const asDate = Date.parse(value);
  if (Number.isNaN(asDate)) return undefined;
  return Math.max(0, Math.floor((asDate - Date.now()) / 1000));
}

function computeBackoff(attempt: number, err?: WassistError): number {
  // Honor server-supplied Retry-After (seconds) when present.
  if (err instanceof WassistRateLimitError && typeof err.retryAfter === 'number') {
    return err.retryAfter * 1000;
  }
  // Exponential backoff with full jitter: random in [base, 2 * base).
  const base = 500 * Math.pow(2, attempt);
  const jitter = base * Math.random();
  return Math.min(base + jitter, 8_000);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableApiError(err: WassistError): boolean {
  return err.statusCode !== undefined && RETRY_STATUSES.has(err.statusCode);
}

function isRetryableTransport(err: WassistError): boolean {
  return err instanceof WassistConnectionError;
}

function mapFetchError(err: unknown): WassistError {
  if (err instanceof Error) {
    if (err.name === 'AbortError') {
      return new WassistTimeoutError({
        message: 'Request timed out.',
        cause: err,
      });
    }
    return new WassistConnectionError({
      message: `Network error: ${err.message}`,
      cause: err,
    });
  }
  return new WassistConnectionError({ message: 'Unknown network error.' });
}
