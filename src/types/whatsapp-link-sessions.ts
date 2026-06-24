import type { UUID } from './common';

export type WhatsAppLinkSessionStatus = 'PENDING' | 'EXPIRED' | 'SUCCESS' | 'FAILED';

/**
 * A WhatsApp account-linking session — used to embed Meta's signup flow
 * for a customer into your own product.
 */
export interface WhatsAppLinkSession {
  id: UUID;
  successUrl: string;
  returnUrl: string;
  status: WhatsAppLinkSessionStatus;
  /** Hosted URL to direct the user to start linking their WhatsApp account. */
  linkUrl: string;
}

/** Input for `POST /whatsapp-link-sessions/`. */
export interface CreateWhatsAppLinkSessionInput {
  /** Where to redirect the user after a successful link. */
  successUrl: string;
  /** Where to redirect the user if they cancel or fail. */
  returnUrl: string;
}
