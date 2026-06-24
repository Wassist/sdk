import type { PageParams, PaginatedResponse, RequestOptions } from './types/common';

/**
 * The shape of a single fetched page, returned by {@link AutoPaginatedList.firstPage}.
 */
export interface Page<T> {
  /** The items on this page. */
  data: T[];
  /** Total number of items across all pages. */
  totalCount: number;
  /** Whether there is at least one more page after this one. */
  hasMore: boolean;
  /** Offset to pass to the next call to continue from this page. */
  nextOffset: number;
}

/**
 * Lazy auto-paginating wrapper around any Wassist list endpoint.
 *
 * Iteration is lazy — pages are fetched on demand as you consume them, so
 * `for await` over a million-item list never has the whole result set in
 * memory.
 *
 * @example Iterate every item
 * ```ts
 * for await (const conv of wassist.conversations.list({ limit: 100 })) {
 *   console.log(conv.id);
 * }
 * ```
 *
 * @example Just the first page
 * ```ts
 * const { data, hasMore } = await wassist.conversations.list().firstPage();
 * ```
 *
 * @example Collect everything into an array (small lists only)
 * ```ts
 * const all = await wassist.agents.list().all();
 * ```
 */
export class AutoPaginatedList<T> implements AsyncIterable<T> {
  private readonly fetchPage: (params: PageParams) => Promise<PaginatedResponse<T>>;
  private readonly params: PageParams;
  private readonly options: RequestOptions | undefined;

  /** @internal */
  constructor(
    fetchPage: (params: PageParams) => Promise<PaginatedResponse<T>>,
    params: PageParams = {},
    options?: RequestOptions
  ) {
    this.fetchPage = fetchPage;
    this.params = params;
    this.options = options;
  }

  /**
   * Async iterator over every item across every page, fetched lazily.
   */
  async *[Symbol.asyncIterator](): AsyncIterator<T> {
    const limit = this.params.limit ?? 50;
    let offset = this.params.offset ?? 0;
    let hasMore = true;

    while (hasMore) {
      const page = await this.fetchPage({ limit, offset });
      for (const item of page.results) yield item;
      hasMore = page.next !== null && page.results.length > 0;
      offset += page.results.length || limit;
    }
  }

  /**
   * Fetch the first page only and return it as a {@link Page}.
   */
  async firstPage(): Promise<Page<T>> {
    const limit = this.params.limit ?? 50;
    const offset = this.params.offset ?? 0;
    const page = await this.fetchPage({ limit, offset });
    return {
      data: page.results,
      totalCount: page.count,
      hasMore: page.next !== null,
      nextOffset: offset + page.results.length,
    };
  }

  /**
   * Walk every page and collect every item into a single array.
   *
   * Convenient for small lists; for large ones prefer `for await`.
   */
  async all(): Promise<T[]> {
    const out: T[] = [];
    for await (const item of this) out.push(item);
    return out;
  }
}

// Re-export for resource modules.
export type { RequestOptions };
