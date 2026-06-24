import type { UUID, ISODateTime } from './common';

export type WhatsAppTemplateCategory = 'UTILITY' | 'MARKETING' | 'AUTHENTICATION';
export type WhatsAppTemplateStatus = 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'PAUSED';
export type WhatsAppTemplateQuality = 'GREEN' | 'YELLOW' | 'RED' | 'UNKNOWN';
export type WhatsAppTemplateParameterFormat = 'POSITIONAL' | 'NAMED';

export type WhatsAppTemplateButtonType =
  | 'QUICK_REPLY'
  | 'URL'
  | 'PHONE_NUMBER'
  | 'COPY_CODE'
  | 'FLOW'
  | 'OTP';

export interface WhatsAppTemplateButton {
  type: WhatsAppTemplateButtonType;
  text: string;
  url?: string;
  phone_number?: string;
  example?: string[];
}

export interface WhatsAppTemplateNamedParam {
  param_name: string;
  example: string;
}

export interface WhatsAppTemplateComponentExample {
  body_text?: string[][];
  header_text?: string[];
  body_text_named_params?: WhatsAppTemplateNamedParam[];
  header_text_named_params?: WhatsAppTemplateNamedParam[];
  header_handle?: string[];
  header_url?: string[];
}

export interface WhatsAppTemplateComponent {
  type: 'HEADER' | 'BODY' | 'FOOTER' | 'BUTTONS';
  format?: 'TEXT' | 'IMAGE' | 'VIDEO' | 'DOCUMENT';
  text?: string;
  example?: WhatsAppTemplateComponentExample;
  buttons?: WhatsAppTemplateButton[];
}

/**
 * The result of publishing a template to a WABA — one entry per account.
 */
export interface WhatsAppTemplateAccountLink {
  accountId: UUID;
  accountName: string | null;
  wabaId: string;
  metaTemplateId: string | null;
  status: WhatsAppTemplateStatus;
  qualityScore: WhatsAppTemplateQuality;
  rejectionReason: string | null;
}

/**
 * A Wassist-managed WhatsApp template, returned by every endpoint under
 * `/whatsapp-templates/`.
 */
export interface WhatsAppTemplate {
  id: UUID;
  name: string;
  category: WhatsAppTemplateCategory;
  language: string;
  parameterFormat: WhatsAppTemplateParameterFormat;
  components: WhatsAppTemplateComponent[];
  /** One entry per WABA this template has been published to. */
  accountLinks: WhatsAppTemplateAccountLink[];
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

/** Input for `POST /whatsapp-templates/`. */
export interface CreateWhatsAppTemplateInput {
  name: string;
  category: WhatsAppTemplateCategory;
  language?: string;
  parameterFormat?: WhatsAppTemplateParameterFormat;
  components?: WhatsAppTemplateComponent[];
}

/** Input for `PATCH /whatsapp-templates/{id}/`. */
export interface UpdateWhatsAppTemplateInput {
  name?: string;
  category?: WhatsAppTemplateCategory;
  language?: string;
  parameterFormat?: WhatsAppTemplateParameterFormat;
  components?: WhatsAppTemplateComponent[];
}

/** Input for `POST /whatsapp-templates/{id}/publish/`. */
export interface PublishWhatsAppTemplateInput {
  /** WABA IDs to publish this template to (must be at least one). */
  accountIds: UUID[];
}

/** Input for `POST /whatsapp-templates/{id}/unpublish/`. */
export interface UnpublishWhatsAppTemplateInput {
  /** WABA IDs to unpublish this template from (must be at least one). */
  accountIds: UUID[];
}

export interface WhatsAppTemplatePublishResult {
  accountId: UUID;
  metaTemplateId?: string;
  status?: string;
  error?: string;
}

export interface WhatsAppTemplateUnpublishResult {
  accountId: UUID;
  unpublished: boolean;
}

/**
 * Extended response from publish/unpublish endpoints — same shape as a
 * regular `WhatsAppTemplate` plus the per-account result arrays.
 */
export interface WhatsAppTemplateWithPublishResults extends WhatsAppTemplate {
  publishResults?: WhatsAppTemplatePublishResult[];
  publishErrors?: WhatsAppTemplatePublishResult[];
  unpublishResults?: WhatsAppTemplateUnpublishResult[];
  unpublishErrors?: WhatsAppTemplatePublishResult[];
}
