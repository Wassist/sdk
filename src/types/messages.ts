import type { UUID, ISODateTime } from './common';
import type { ImageInfo } from './agents';

export type MessageRole = 'user' | 'assistant' | 'system';

export type MessageType =
  | 'text'
  | 'image'
  | 'cta'
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
// Tool executions
// =============================================================================

/**
 * Origin of a tool execution. Mirrors the backend `ToolExecutionType`
 * choices.
 */
export type ToolExecutionType =
  | 'api'
  | 'webhook'
  | 'mcp'
  | 'content_generation'
  | 'built_in'
  | 'shopify'
  | 'web_search';

/**
 * A single tool call the agent ran while producing a message. The
 * payloads in `args` / `result` are tool-specific.
 */
export interface SessionToolExecution {
  id: UUID;
  toolName: string;
  toolType: ToolExecutionType;
  args: Record<string, unknown>;
  result: Record<string, unknown>;
  error: string;
  durationMs: number | null;
  createdAt: ISODateTime;
}

// =============================================================================
// Click-to-WhatsApp referral
// =============================================================================

/**
 * WhatsApp's `referral` object for an inbound message the customer sent
 * after tapping a Click-to-WhatsApp ad (or boosted post).
 */
export interface MessageReferral {
  /** The inbound message this referral arrived on. */
  messageId: UUID;
  /** `ad` or `post`. */
  sourceType: string | null;
  /** Meta ad or post ID. */
  sourceId: string | null;
  /** URL of the ad or post the customer tapped. */
  sourceUrl: string | null;
  headline: string | null;
  body: string | null;
  /** `image` or `video`. */
  mediaType: string | null;
  imageUrl: string | null;
  videoUrl: string | null;
  thumbnailUrl: string | null;
  /**
   * Click-to-WhatsApp click ID. Send it back to Meta via the Conversions
   * API to attribute downstream events (leads, purchases) to the ad.
   */
  ctwaClid: string | null;
  /** The ad's pre-filled welcome message, when WhatsApp includes it. */
  welcomeMessage: string | null;
  /** When the customer sent the referred message. */
  createdAt: ISODateTime;
}

// =============================================================================
// Message envelope
// =============================================================================

/**
 * A single message in a conversation. Exactly one of `text`, `image`,
 * `cta`, `listSelection`, `template`, `unified`, or `quickReply` will
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

  /**
   * Tool executions the agent ran while producing this message. Empty
   * for user / system messages and assistant messages that didn't invoke
   * any tools. Includes API, webhook, MCP, content-generation and
   * built-in tool calls.
   *
   * Optional for forward compatibility with older API responses that
   * pre-date this field; new responses always include an array.
   */
  toolExecutions?: SessionToolExecution[];

  /**
   * Set on inbound messages the customer sent from a Click-to-WhatsApp
   * ad; `null` otherwise.
   */
  referral?: MessageReferral | null;
}

// =============================================================================
// Send-message inputs
// =============================================================================

/** Template name + variables, used both for `messages.send` and `conversations.create`. */
export interface SendMessageTemplateInput {
  /** Approved WhatsApp template name. */
  name: string;
  /**
   * Variable values, keyed by component. For a positional template ({{1}},
   * {{2}}) pass a list matching the placeholder order; for a named template
   * ({{customer_name}}) pass an object keyed by variable name.
   */
  variables?: {
    body?: string[] | Record<string, string>;
    header?: string[] | Record<string, string>;
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
