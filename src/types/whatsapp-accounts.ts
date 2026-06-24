import type { UUID } from './common';

/**
 * A WhatsApp Business Account (WABA) linked to your Wassist account.
 */
export interface WhatsAppAccount {
  id: UUID;
  name: string | null;
  /** Meta's WABA ID. */
  waId: string;
  phoneNumbers: WhatsAppAccountPhoneNumber[];
  /** URL to the WhatsApp Business Manager templates page for this WABA. */
  templatesUrl: string;
}

export interface WhatsAppAccountPhoneNumber {
  id: UUID;
  number: string;
  bot: { id: UUID; name: string } | null;
  waba: { id: UUID; name: string | null } | null;
}

/**
 * Input for `POST /whatsapp-accounts/{id}/add-number/`.
 *
 * Adds a pre-verified phone number (purchased via Meta's embedded signup
 * flow) to an existing WhatsApp Business Account.
 */
export interface AddNumberInput {
  /** The pre-verified Twilio phone number ID. */
  id: string;
  /** Verified business name to display to WhatsApp recipients. */
  name: string;
}

/**
 * A single available phone number returned by `GET /available-numbers/`.
 */
export interface AvailableNumber {
  id: string;
  phone_number: string;
}

/**
 * Response shape of `GET /available-numbers/`.
 */
export interface AvailableNumbersResponse {
  available_numbers: AvailableNumber[];
}
