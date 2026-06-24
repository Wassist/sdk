import type { UUID, ISODateTime, PhoneNumberString } from './common';

/**
 * The base shape every webhook event shares.
 */
export interface WassistEventBase<TEvent extends string = string> {
  /** The event name (e.g. `"message.received"`). */
  event: TEvent;
  /** Server-side timestamp the event was emitted (ISO-8601 UTC). */
  timestamp: ISODateTime;
}

// =============================================================================
// message.received
// =============================================================================

export interface MessageReceivedMessage {
  id: UUID;
  /** Meta's `wamid.` ID for the inbound WhatsApp message. */
  waId: string;
  body: string;
  media: { url: string; mimeType: string }[];
  buttons: { type: 'url' | 'quick_reply'; text: string; url?: string; quickReplyId?: string }[];
}

export interface MessageReceivedEvent extends WassistEventBase<'message.received'> {
  /** Your phone number that received the message. */
  phoneNumber: PhoneNumberString;
  /** The contact's phone number. */
  from: PhoneNumberString;
  contact: { name: string | null; phoneNumber: PhoneNumberString };
  message: MessageReceivedMessage;
  conversationId: UUID;
}

// =============================================================================
// subscription.activated / subscription.revoked
// =============================================================================

export interface SubscriptionActivatedEvent extends WassistEventBase<'subscription.activated'> {
  webhookId: UUID;
  conversationId: UUID;
  phoneNumber: PhoneNumberString;
  contact: { name: string | null; phoneNumber: PhoneNumberString };
}

export interface SubscriptionRevokedEvent extends WassistEventBase<'subscription.revoked'> {
  webhookId: UUID;
  conversationId: UUID;
  phoneNumber: PhoneNumberString;
  contact: { name: string | null; phoneNumber: PhoneNumberString };
}

// =============================================================================
// subscription.message.received
// =============================================================================

/**
 * Fired when an inbound user message lands on a conversation whose
 * routing has been switched to `webhook` (either at the number level via
 * `phoneNumbers.subscribe` or at the conversation level via
 * `conversations.subscribe`). The agent pipeline is skipped — delivery
 * goes **only** to the assigned webhook, with no fan-out.
 *
 * The envelope is identical to {@link MessageReceivedEvent} with two
 * extra fields ({@link routing} and {@link webhookId}) so you can tell
 * subscription-routed traffic apart from the legacy broadcast event.
 *
 * @see https://docs.wassist.app/guides/webhooks/routing
 */
export interface SubscriptionMessageReceivedEvent
  extends WassistEventBase<'subscription.message.received'> {
  /** Your phone number that received the message. */
  phoneNumber: PhoneNumberString;
  /** The contact's phone number. */
  from: PhoneNumberString;
  contact: { name: string | null; phoneNumber: PhoneNumberString };
  message: MessageReceivedMessage;
  conversationId: UUID;
  /** Always `"webhook"` for this event — included for symmetry with the lifecycle events. */
  routing: 'webhook';
  /** The webhook the conversation is subscribed to. */
  webhookId: UUID;
}

// =============================================================================
// test.ping
// =============================================================================

export interface TestPingEvent extends WassistEventBase<'test.ping'> {
  /** Stub payload — used by the dashboard "Send test event" button. */
  message: string;
}

// =============================================================================
// Union
// =============================================================================

/**
 * Discriminated union of every documented Wassist webhook event. Designed
 * for clean narrowing in a `switch (event.event)`:
 *
 * ```ts
 * switch (event.event) {
 *   case 'message.received':              event.message.body;     // typed
 *   case 'subscription.activated':        event.webhookId;        // typed
 *   case 'subscription.message.received': event.webhookId;        // typed
 * }
 * ```
 *
 * For forward-compatibility with new event types Wassist may ship before
 * you upgrade the SDK, see {@link UnrecognizedWassistEvent}.
 */
export type WassistEvent =
  | MessageReceivedEvent
  | SubscriptionActivatedEvent
  | SubscriptionMessageReceivedEvent
  | SubscriptionRevokedEvent
  | TestPingEvent;

/**
 * Catch-all shape for events whose name {@link WassistEvent} doesn't yet
 * know about. `constructEvent` never throws on an unrecognized event name
 * at runtime — cast to this type when you need to inspect a future event:
 *
 * ```ts
 * const event = Wassist.webhooks.constructEvent(...);
 * if ((event.event as string).startsWith('beta.')) {
 *   const unknown = event as UnrecognizedWassistEvent;
 *   console.log(unknown.event, unknown.timestamp);
 * }
 * ```
 */
export type UnrecognizedWassistEvent = WassistEventBase<string> &
  Record<string, unknown>;
