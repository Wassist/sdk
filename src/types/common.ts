/**
 * Common building-block types reused across every resource.
 */

/** A UUID string. */
export type UUID = string;

/** An ISO-8601 datetime string (`YYYY-MM-DDTHH:mm:ss.sssZ`). */
export type ISODateTime = string;

/** A WhatsApp E.164-format phone number (e.g. `+447424845871`). */
export type PhoneNumberString = string;

/**
 * Standard offset/limit pagination parameters accepted by every list endpoint.
 *
 * @see https://wassist.com/api-reference/introduction
 */
export interface PageParams {
  /** Number of results to return per page. */
  limit?: number;
  /** Initial index from which to return results. */
  offset?: number;
}

/**
 * Raw paginated response envelope returned by the Wassist API.
 *
 * Most callers will never see this directly — list methods return a
 * higher-level {@link AutoPaginatedList} that wraps it.
 */
export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

/**
 * Per-request options accepted by every method on the SDK.
 */
export interface RequestOptions {
  /**
   * If supplied, sent as the `Idempotency-Key` header so retried `POST`s
   * do not double-charge or double-fire side effects.
   *
   * Generate a random UUID per logical operation and reuse it for retries.
   */
  idempotencyKey?: string;
  /**
   * Per-request timeout in milliseconds. Overrides the client default.
   */
  timeout?: number;
  /**
   * Per-request retry override. Overrides the client default.
   */
  maxRetries?: number;
  /**
   * Per-request abort signal. Aborting throws a {@link WassistConnectionError}.
   */
  signal?: AbortSignal;
  /**
   * Extra headers merged into the request.
   */
  headers?: Record<string, string>;
}
