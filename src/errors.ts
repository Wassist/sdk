/**
 * Error hierarchy for the Wassist SDK.
 *
 * Every network response and webhook signature failure surfaces as a subclass
 * of {@link WassistError}, so consumers can branch on `instanceof` (Stripe
 * convention) and read `statusCode`, `code`, `requestId`, and the raw body.
 */

export interface WassistErrorOptions {
  message: string;
  statusCode?: number;
  code?: string;
  requestId?: string;
  raw?: unknown;
  cause?: unknown;
}

export class WassistError extends Error {
  /** HTTP status code if this error originated from an API response. */
  readonly statusCode?: number;
  /** Machine-readable error code (e.g. `not_found`) when the API provides one. */
  readonly code?: string;
  /**
   * Request ID surfaced by the Wassist API in the `X-Request-Id` response
   * header. Include this when filing support tickets.
   */
  readonly requestId?: string;
  /** Raw response body, parsed as JSON when possible. */
  readonly raw?: unknown;

  constructor(opts: WassistErrorOptions) {
    super(opts.message);
    this.name = new.target.name;
    this.statusCode = opts.statusCode;
    this.code = opts.code;
    this.requestId = opts.requestId;
    this.raw = opts.raw;
    if (opts.cause !== undefined) {
      (this as { cause?: unknown }).cause = opts.cause;
    }
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/** 401 Unauthorized — the API key was missing, malformed, or revoked. */
export class WassistAuthenticationError extends WassistError {}

/** 403 Forbidden — the API key lacks permission for this resource. */
export class WassistPermissionError extends WassistError {}

/** 400 / 422 — the request body or parameters were invalid. */
export class WassistInvalidRequestError extends WassistError {}

/** 404 Not Found — the requested resource does not exist. */
export class WassistNotFoundError extends WassistError {}

/** 409 Conflict — the request conflicts with the current state. */
export class WassistConflictError extends WassistError {}

/** 429 Too Many Requests — slow down or wait `retryAfter` seconds. */
export class WassistRateLimitError extends WassistError {
  /** Suggested wait in seconds, from the `Retry-After` response header. */
  readonly retryAfter?: number;

  constructor(opts: WassistErrorOptions & { retryAfter?: number }) {
    super(opts);
    this.retryAfter = opts.retryAfter;
  }
}

/** 5xx — something is wrong on Wassist's side. The SDK retries these automatically. */
export class WassistAPIError extends WassistError {}

/** A network-level failure (DNS, TCP, TLS, abort, etc.) — never made it to the server. */
export class WassistConnectionError extends WassistError {}

/** The request exceeded the configured `timeout`. */
export class WassistTimeoutError extends WassistError {}

/**
 * Webhook signature could not be verified.
 *
 * Thrown by {@link Wassist.webhooks.constructEvent} when the header is
 * malformed, the HMAC doesn't match, or the timestamp falls outside the
 * tolerance window.
 */
export class WassistSignatureVerificationError extends WassistError {
  /** The raw `X-Wassist-Signature` header value as received. */
  readonly header?: string;
  /** The payload that was verified, as the SDK saw it. */
  readonly payload?: string;

  constructor(
    opts: WassistErrorOptions & { header?: string; payload?: string }
  ) {
    super(opts);
    this.header = opts.header;
    this.payload = opts.payload;
  }
}

/**
 * Map an HTTP status code + response body to the most specific error class.
 *
 * @internal
 */
export function errorFromResponse(args: {
  status: number;
  body: unknown;
  requestId?: string;
  retryAfter?: number;
}): WassistError {
  const { status, body, requestId, retryAfter } = args;

  const message = extractMessage(body) ?? `HTTP ${status}`;
  const code = extractCode(body);
  const base = { message, statusCode: status, code, requestId, raw: body };

  if (status === 401) return new WassistAuthenticationError(base);
  if (status === 403) return new WassistPermissionError(base);
  if (status === 404) return new WassistNotFoundError(base);
  if (status === 409) return new WassistConflictError(base);
  if (status === 429) return new WassistRateLimitError({ ...base, retryAfter });
  if (status === 400 || status === 422) {
    return new WassistInvalidRequestError(base);
  }
  if (status >= 500 && status < 600) return new WassistAPIError(base);
  return new WassistError(base);
}

function extractMessage(body: unknown): string | undefined {
  if (!body || typeof body !== 'object') return undefined;
  const b = body as Record<string, unknown>;
  if (typeof b.error === 'string') return b.error;
  if (typeof b.message === 'string') return b.message;
  if (typeof b.detail === 'string') return b.detail;
  if (b.error && typeof b.error === 'object') {
    const inner = (b.error as Record<string, unknown>).message;
    if (typeof inner === 'string') return inner;
  }
  return undefined;
}

function extractCode(body: unknown): string | undefined {
  if (!body || typeof body !== 'object') return undefined;
  const b = body as Record<string, unknown>;
  if (typeof b.code === 'string') return b.code;
  return undefined;
}
