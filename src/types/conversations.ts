import type { UUID, ISODateTime } from './common';
import type { MessageRole, SendMessageTemplateInput } from './messages';
import type { PhoneNumberRoutingMode } from './phone-numbers';

export interface ConversationContact {
  phoneNumber: string;
  name: string | null;
}

export interface ConversationLastMessage {
  /**
   * Discriminator for the original message (e.g. `text`, `image`,
   * `cta`, `template`). Useful for showing a type-aware icon
   * alongside the preview text in list views.
   */
  type: string;
  /** Short, human-readable preview of the message body. */
  body: string;
  createdAt: ISODateTime;
  role: MessageRole;
}

/**
 * Identity block for the contact's active Shopify Customer Account login.
 * Present only when the contact is signed in to at least one Shopify store
 * (via the Customer Account OAuth flow). Never exposes tokens.
 */
export interface ConversationShopifyCustomer {
  /** Customer email (may be missing on very old logins). */
  email: string | null;
  /**
   * Shopify Customer GID (e.g. `gid://shopify/Customer/123456`). May be
   * `null` if the identity query failed at callback.
   */
  shopifyCustomerId: string | null;
  /** Store display name (falls back to the myshopify domain). */
  storeName: string;
  /** Fully-qualified myshopify.com domain. */
  shopDomain: string;
  /** When this login row was created. */
  loggedInAt: ISODateTime;
}

/**
 * A Wassist conversation between one of your phone numbers and a contact.
 */
export interface Conversation {
  id: UUID;
  contact: ConversationContact;
  activeAgent: { id: UUID; name: string } | null;
  whatsappNumber: {
    id: UUID;
    number: string;
    /** `true` for shared sandbox numbers (no WhatsApp Business Account). */
    isSandbox: boolean;
  } | null;
  /** Seconds left in the WhatsApp 24-hour reply window. */
  chatWindowRemainingTime: number;
  lastMessage: ConversationLastMessage | null;
  isHumanTakeover: boolean;
  active: boolean;
  /**
   * Resolved routing mode. Inherits from the phone number's default when
   * no per-conversation override is set. `sandbox` for any conversation on
   * a sandbox number. `null` = message is stored but nothing else happens.
   */
  routing: PhoneNumberRoutingMode | null;
  /** Webhook currently subscribed to this conversation, or `null`. */
  webhookId: UUID | null;
  /**
   * `true` when this conversation has a per-conversation routing override
   * rather than inheriting from the phone number's default routing.
   */
  routingOverride: boolean;
  /**
   * Identity for the contact's active Shopify Customer Account login,
   * or `null` if the contact is not signed in to any Shopify store.
   */
  shopifyCustomer: ConversationShopifyCustomer | null;
}

/**
 * Filters and ordering for `GET /conversations/`.
 */
export interface ListConversationsParams {
  /** Filter by agent ID. */
  agent?: UUID;
  /** Filter by your WhatsApp number (substring match on `number`). */
  whatsappNumber?: string;
  /** Filter by contact phone number. */
  contact?: string;
  /** `active` = had inbound message in last 24h, `closed` = otherwise. */
  status?: 'active' | 'closed';
  /** Only return conversations with unread inbound messages. */
  hasUnread?: boolean;
  /** ISO datetime — only return conversations with messages after this time. */
  lastMessageAfter?: ISODateTime;
  /** ISO datetime — only return conversations with messages before this time. */
  lastMessageBefore?: ISODateTime;
  ordering?:
    | 'last_message_time'
    | '-last_message_time'
    | 'created_at'
    | '-created_at'
    | 'updated_at'
    | '-updated_at';
  /** Pagination. */
  limit?: number;
  offset?: number;
}

/** Optional first-template message included with `POST /conversations/`. */
export interface CreateConversationMessageInput {
  type: 'template';
  template?: SendMessageTemplateInput;
}

/** Input for `POST /conversations/`. */
export interface CreateConversationInput {
  /** The recipient's WhatsApp number in E.164 format (e.g. `+447700900100`). */
  toNumber: string;
  /**
   * Your sending number. Optional — when omitted, the agent's primary number
   * is used.
   */
  fromNumber?: string;
  /** Agent to start the conversation with. */
  agentId?: UUID;
  /**
   * Optional first message to send. Required if the WhatsApp 24-hour
   * reply window is closed.
   */
  message?: CreateConversationMessageInput;
}

/** Input for `POST /conversations/{id}/subscribe/`. */
export interface SubscribeConversationInput {
  /** Webhook to route this conversation to. */
  webhookId: UUID;
}
