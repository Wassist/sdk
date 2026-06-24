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
 *   case 'message.received':       event.message.body;     // typed
 *   case 'subscription.activated': event.webhookId;        // typed
 * }
 * ```
 *
 * For forward-compatibility with new event types Wassist may ship before
 * you upgrade the SDK, see {@link UnrecognizedWassistEvent}.
 */
export type WassistEvent =
  | MessageReceivedEvent
  | SubscriptionActivatedEvent
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
