import type { HttpClient } from '../http';
import { AutoPaginatedList } from '../pagination';
import type {
  Conversation,
  CreateConversationInput,
  ListConversationsParams,
  SubscribeConversationInput,
} from '../types/conversations';
import type { PromptAgentInput } from '../types/messages';
import type { PaginatedResponse, RequestOptions, UUID } from '../types/common';
import { MessagesResource } from './messages';

/**
 * Methods for managing conversations — ongoing WhatsApp chats between
 * your numbers and a contact.
 *
 * Nested namespace: `wassist.conversations.messages` (see {@link MessagesResource}).
 */
export class ConversationsResource {
  /** Send and list messages within a conversation. */
  readonly messages: MessagesResource;

  /** @internal */
  constructor(private readonly http: HttpClient) {
    this.messages = new MessagesResource(http);
  }

  /**
   * List conversations on your account with rich filtering.
   *
   * `GET /conversations/`
   *
   * @example
   * ```ts
   * const recent = await wassist.conversations
   *   .list({ ordering: '-last_message_time', limit: 20 })
   *   .firstPage();
   * ```
   */
  list(
    params: ListConversationsParams = {},
    options?: RequestOptions
  ): AutoPaginatedList<Conversation> {
    const { limit, offset, ...filters } = params;
    return new AutoPaginatedList<Conversation>(
      (p) =>
        this.http.get<PaginatedResponse<Conversation>>('/conversations/', {
          query: { ...filters, ...p },
          options,
        }),
      { limit, offset },
      options
    );
  }

  /**
   * Retrieve a single conversation by ID.
   *
   * `GET /conversations/{id}/`
   */
  get(id: UUID, options?: RequestOptions): Promise<Conversation> {
    return this.http.get<Conversation>(`/conversations/${encodeURIComponent(id)}/`, {
      options,
    });
  }

  /**
   * Create a new conversation with a contact.
   *
   * If the WhatsApp 24-hour reply window is closed for this contact, you
   * must include a `template` message to open it.
   *
   * `POST /conversations/`
   */
  create(input: CreateConversationInput, options?: RequestOptions): Promise<Conversation> {
    return this.http.post<Conversation>('/conversations/', input, options);
  }

  /**
   * Prompt the agent in this conversation with a custom instruction.
   * Equivalent to "wake the agent up and have it say this" — useful for
   * outbound triggers and follow-ups.
   *
   * `POST /conversations/{id}/prompt/`
   */
  prompt(id: UUID, input: PromptAgentInput, options?: RequestOptions): Promise<void> {
    return this.http.post<void>(
      `/conversations/${encodeURIComponent(id)}/prompt/`,
      input,
      options
    );
  }

  /**
   * Send a WhatsApp read receipt for the most recent inbound message.
   *
   * `POST /conversations/{id}/read/`
   */
  read(id: UUID, options?: RequestOptions): Promise<Conversation> {
    return this.http.post<Conversation>(
      `/conversations/${encodeURIComponent(id)}/read/`,
      undefined,
      options
    );
  }

  /**
   * Display the WhatsApp typing indicator on the contact's device.
   *
   * Note: WhatsApp also marks the most recent inbound message as read as
   * a side effect — this is a platform limitation.
   *
   * `POST /conversations/{id}/typing/`
   */
  typing(id: UUID, options?: RequestOptions): Promise<Conversation> {
    return this.http.post<Conversation>(
      `/conversations/${encodeURIComponent(id)}/typing/`,
      undefined,
      options
    );
  }

  /**
   * Route this conversation to a webhook. The agent pipeline is skipped
   * while the override is active.
   *
   * Fires a `subscription.activated` event on the target webhook.
   *
   * `POST /conversations/{id}/subscribe/`
   */
  subscribe(
    id: UUID,
    input: SubscribeConversationInput,
    options?: RequestOptions
  ): Promise<Conversation> {
    return this.http.post<Conversation>(
      `/conversations/${encodeURIComponent(id)}/subscribe/`,
      input,
      options
    );
  }

  /**
   * Clear the per-conversation routing override and fall back to the
   * phone number's default routing.
   *
   * Fires a `subscription.revoked` event on the previously-subscribed
   * webhook (if any).
   *
   * `POST /conversations/{id}/unsubscribe/`
   */
  unsubscribe(id: UUID, options?: RequestOptions): Promise<Conversation> {
    return this.http.post<Conversation>(
      `/conversations/${encodeURIComponent(id)}/unsubscribe/`,
      undefined,
      options
    );
  }
}
