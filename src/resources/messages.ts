import type { HttpClient } from '../http';
import { AutoPaginatedList } from '../pagination';
import type { Message, SendMessageInput } from '../types/messages';
import type { PageParams, PaginatedResponse, RequestOptions, UUID } from '../types/common';

/**
 * Messages within a conversation. Reached via `wassist.conversations.messages`.
 *
 * Documented at https://docs.wassist.app/api-reference/conversations/messages/list
 * and https://docs.wassist.app/api-reference/conversations/messages/send.
 */
export class MessagesResource {
  /** @internal */
  constructor(private readonly http: HttpClient) {}

  /**
   * List messages in a conversation, newest first.
   *
   * `GET /conversations/{id}/messages/`
   */
  list(
    conversationId: UUID,
    params: PageParams = {},
    options?: RequestOptions
  ): AutoPaginatedList<Message> {
    const path = `/conversations/${encodeURIComponent(conversationId)}/messages/`;
    return new AutoPaginatedList<Message>(
      async (p) => {
        // The endpoint returns a bare array of up to `limit` messages rather
        // than the usual envelope.
        const res = await this.http.get<PaginatedResponse<Message> | Message[]>(path, { query: p, options });
        if (!Array.isArray(res)) return res;
        const full = p.limit !== undefined && res.length >= p.limit;
        return { count: (p.offset ?? 0) + res.length, next: full ? 'more' : null, previous: null, results: res };
      },
      params,
      options
    );
  }

  /**
   * Send a message in a conversation.
   *
   * The input is a discriminated union — set `type` and populate the
   * matching field (`text`, `template`, `cta`, or `unified`).
   *
   * `POST /conversations/{id}/messages/`
   *
   * @example Plain text
   * ```ts
   * await wassist.conversations.messages.send(conv.id, {
   *   type: 'text',
   *   text: { body: 'Hello!' },
   * });
   * ```
   *
   * @example Approved template
   * ```ts
   * await wassist.conversations.messages.send(conv.id, {
   *   type: 'template',
   *   template: { name: 'order_update', variables: { body: ['Alex', '#1234'] } },
   * });
   * ```
   */
  send(
    conversationId: UUID,
    input: SendMessageInput,
    options?: RequestOptions
  ): Promise<Message> {
    const path = `/conversations/${encodeURIComponent(conversationId)}/messages/`;
    return this.http.post<Message>(path, input, options);
  }
}
