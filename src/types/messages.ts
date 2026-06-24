import type { UUID, ISODateTime } from './common';
import type { ImageInfo } from './agents';

export type MessageRole = 'user' | 'assistant' | 'system';

export type MessageType =
  | 'text'
  | 'image'
  | 'cta_button'
  | 'list_selection'
  | 'template'
  | 'unified'
  | 'quick_reply';

export type MessageStatus = 'sent' | 'delivered' | 'read' | 'failed';

// =============================================================================
// Message content variants
// =============================================================================

export interface TextMessage {
  id: UUID;
  body: string;
}

export interface ImageMessage {
  id: UUID;
  image: ImageInfo | null;
  caption: string | null;
}

export interface CTAButtonMessage {
  id: UUID;
  text: string;
  url: string | null;
  buttonText: string;
  image: ImageInfo | null;
  clicks: { id: UUID; createdAt: ISODateTime }[];
}

export interface ListSelectionMessage {
  id: UUID;
  text: string;
  buttonText: string;
  sections: Record<string, unknown>[];
}

export interface TemplateMessage {
  id: UUID;
  templateName: string;
  variables: Record<string, unknown>;
  components: Record<string, unknown>[];
}

export type UnifiedMessageButtonType = 'url' | 'quick_reply';

export interface UnifiedMessageButton {
  type: UnifiedMessageButtonType;
  text: string;
  url?: string;
  quickReplyId?: string;
}

export interface UnifiedMessageMedia {
  url: string;
  mimeType: string;
}

export interface UnifiedMessage {
  body: string | null;
  footer: string | null;
  buttons: UnifiedMessageButton[];
  media: UnifiedMessageMedia[];
}

export interface QuickReplyMessage {
  text: string;
  quickReplyId: string;
}

// =============================================================================
// Message envelope
// =============================================================================

/**
 * A single message in a conversation. Exactly one of `text`, `image`,
 * `ctaButton`, `listSelection`, `template`, `unified`, or `quickReply` will
 * be populated based on `type`.
 */
export interface Message {
  id: UUID;
  role: MessageRole;
  type: MessageType;
  status: MessageStatus | null;
  createdAt: ISODateTime;
  replyTo: UUID | null;

  text: TextMessage | null;
  image: ImageMessage | null;
  cta: CTAButtonMessage | null;
  listSelection: ListSelectionMessage | null;
  template: TemplateMessage | null;
  unified: UnifiedMessage | null;
  quickReply: QuickReplyMessage | null;
}

// =============================================================================
// Send-message inputs
// =============================================================================

/** Template name + variables, used both for `messages.send` and `conversations.create`. */
export interface SendMessageTemplateInput {
  /** Approved WhatsApp template name. */
  name: string;
  /**
   * Variable values, keyed by component. Each list is positional and
   * matches the placeholder order in the approved template.
   */
  variables?: {
    body?: string[];
    header?: string[];
    buttons?: string[];
  };
}

export interface SendMessageTextInput {
  /** Plain-text body (max 1024 characters). */
  body: string;
}

export interface SendMessageCtaImageInput {
  url: string;
}

export interface SendMessageCtaInput {
  /** Message body text (max 1024 characters). */
  body: string;
  /** Button label (max 20 characters). */
  buttonText: string;
  /** URL to open when the button is tapped. */
  url: string;
  image?: SendMessageCtaImageInput;
}

export interface SendUnifiedMessageButtonInput {
  type: UnifiedMessageButtonType;
  text: string;
  url?: string;
  quickReplyId?: string;
}

export interface SendUnifiedMessageMediaInput {
  url: string;
}

export interface SendUnifiedMessageInput {
  text?: string;
  /** Footer text (max 60 characters). */
  footer?: string;
  media?: SendUnifiedMessageMediaInput;
  /** Up to 3 buttons of a single type. */
  buttons?: SendUnifiedMessageButtonInput[];
}

/**
 * Discriminated union input for `POST /conversations/{id}/messages/`.
 *
 * Set `type` and populate the corresponding sibling field.
 */
export type SendMessageInput =
  | { type: 'text'; text: SendMessageTextInput }
  | { type: 'template'; template: SendMessageTemplateInput }
  | { type: 'cta'; cta: SendMessageCtaInput }
  | { type: 'unified'; unified: SendUnifiedMessageInput };

/** Input for `POST /conversations/{id}/prompt/`. */
export interface PromptAgentInput {
  /** Free-form instruction sent to the active agent. */
  prompt: string;
}
