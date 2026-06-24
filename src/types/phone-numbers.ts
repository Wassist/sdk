import type { UUID } from './common';

/**
 * Active routing modes for a phone number or conversation.
 *
 * "No routing" is represented as `null`, not the string `"none"`.
 */
export type PhoneNumberRoutingMode = 'agent' | 'webhook' | 'sandbox';

/**
 * A WhatsApp phone number connected to your Wassist account.
 *
 * The `number` field is the resource identifier in the URL — pass it as the
 * `number` argument to every `phoneNumbers.*` method.
 */
export interface PhoneNumber {
  /** Wassist's internal UUID for this number. */
  id: UUID;
  /** The number itself, in E.164 without the leading `+`. Used in URLs. */
  number: string;
  /** Meta's phone number ID — pass to the WhatsApp Business API. */
  whatsappPhoneNumberId: string;
  whatsappBusinessAccount: {
    id: UUID;
    name: string | null;
    waId: string;
  } | null;
  activeAgent: {
    id: UUID;
    name: string;
    icebreakers: string[];
  } | null;
  /**
   * How inbound messages on this number are handled by default.
   *
   * - `'agent'` / `'webhook'` — run the corresponding pipeline.
   * - `'sandbox'` — system-managed; not user-settable.
   * - `null` — no routing. Messages are stored but nothing else happens.
   */
  defaultRouting: PhoneNumberRoutingMode | null;
  /** Webhook used when `defaultRouting === 'webhook'`. */
  defaultWebhook: {
    id: UUID;
    name: string;
    url: string;
  } | null;
  /** `true` for shared sandbox numbers (no WhatsApp Business Account). */
  isSandbox: boolean;
}

/**
 * The WhatsApp Business Profile for a number, returned by
 * `GET /phone-numbers/{number}/business-profile/`.
 */
export interface PhoneNumberBusinessProfile {
  about?: string;
  description?: string;
  address?: string;
  email?: string;
  profilePictureUrl?: string;
  websites?: string[];
  vertical?: string;
  /** `true` when the profile is still using Wassist's default branding. */
  isStarterBranded: boolean;
}

/**
 * Input for `POST /phone-numbers/{number}/subscribe/`.
 *
 * Routes the number to the given webhook (sets `defaultRouting='webhook'`,
 * `defaultWebhook=W`). Any agent previously connected to the number is
 * dropped.
 */
export interface SubscribePhoneNumberInput {
  /** Webhook to route inbound messages to. */
  webhookId: UUID;
  /**
   * When `true` (default), every existing conversation on this number is
   * updated so the new routing takes effect for in-flight chats:
   * `activeAgent` is cleared and any open session is dropped.
   *
   * Phone-number routing changes do **not** fire `subscription.activated`
   * / `.revoked` webhook events — those are reserved for per-conversation
   * subscribe/unsubscribe.
   */
  applyToExisting?: boolean;
}

/**
 * Input for `POST /phone-numbers/{number}/connect-agent/`.
 *
 * Sets `defaultRouting='agent'` and assigns the given agent. Any webhook
 * subscribed to the number is dropped. The agent must already be owned by
 * or shared with the caller.
 */
export interface ConnectAgentInput {
  /** Agent to connect to this number. */
  agentId: UUID;
  /** See {@link SubscribePhoneNumberInput.applyToExisting}. */
  applyToExisting?: boolean;
}

/**
 * Input for `POST /phone-numbers/{number}/unsubscribe/`.
 *
 * Clears default routing entirely (sets `defaultRouting=null`) and drops
 * both the agent and the default webhook.
 */
export interface UnsubscribePhoneNumberInput {
  applyToExisting?: boolean;
}
