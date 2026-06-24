import type { UUID, ISODateTime } from './common';

/**
 * A reference to a file uploaded into Wassist (used for agent documents
 * and profile pictures).
 */
export interface FileInfo {
  name: string;
  path: string;
  size: number;
  url: string;
}

/** A reference to an image stored on Wassist. */
export interface ImageInfo extends FileInfo {
  width: number;
  height: number;
}

/** Minimal user descriptor returned on agent owner/sharings fields. */
export interface PublicUser {
  phoneNumber: string;
  whatsappName: string | null;
}

// =============================================================================
// Agent sub-resources
// =============================================================================

export interface AgentTool {
  id: UUID;
  name: string;
  description: string;
  apiSchema: Record<string, unknown>;
  active: boolean;
  creditCost: number;
}

export interface AgentDocument {
  id: UUID;
  name: string;
  file: FileInfo;
  status: 'pending' | 'processing' | 'ready' | 'error';
}

export interface AgentMemoryKey {
  id: UUID;
  key: string;
  type: 'string' | 'number' | 'boolean' | 'json';
  initialValue: string;
  whenToUpdate: string;
}

export interface AgentWakeUpConfig {
  id: UUID;
  description: string;
  enabled: boolean;
  forceMessage: boolean;
}

export interface AgentOutboundTrigger {
  id: UUID;
  url: string;
  secret: string;
  enabled: boolean;
  templateId: string;
  templateName: string;
}

export interface AgentWebsiteTool {
  id: UUID;
  url: string;
  prompt: string;
  active: boolean;
}

export interface AgentImageGenerateTool {
  id: UUID;
  name: string;
  description: string;
  prompt: string;
  active: boolean;
  creditCost: number;
}

export interface AgentHandoffTool {
  id: UUID;
  parentAgentId: UUID;
  childAgentId: UUID;
  childAgentName: string;
  description: string;
  active: boolean;
}

export interface AgentMcpConfig {
  id: UUID;
  connectorId: UUID;
  connectorName: string;
  toolWhitelist: string[];
}

export interface AgentPaywallConfig {
  id: UUID;
  messageLimit: number | null;
  paywallAction: 'none' | 'purchase_link' | 'subscribe' | 'terminal';
  paywallUrl: string | null;
  ctaButtonText: string;
  terminalStateMessage: string;
  subscriptionPricePerMonth: number | null;
}

export interface AgentCreditSettings {
  id: UUID;
  initialCredits: number;
  creditGrantPassword: string | null;
  creditGrantAmount: number;
}

export interface AgentWhatsAppPhoneNumber {
  /** Meta's phone number ID — pass to the WhatsApp Business API. */
  whatsappPhoneNumberId: string;
  /** Meta's WABA ID, or `null` for sandbox numbers. */
  whatsappBusinessAccountId: string | null;
  /** Wassist's internal WABA UUID. */
  wabaId: UUID | null;
  /** Display number (E.164 without leading `+`). */
  phoneNumber: string;
}

// =============================================================================
// Agent
// =============================================================================

/**
 * A fully-hydrated Wassist agent, as returned by `GET /agents/{id}/`.
 */
export interface Agent {
  id: UUID;
  name: string;
  description: string;
  systemPrompt: string;
  firstMessage: string;
  profilePicture: ImageInfo | null;
  icebreakers: string[];
  llmModel: string | null;

  // Nested sub-resources (read-only on this view; managed via `update`).
  tools: AgentTool[];
  documents: AgentDocument[];
  memoryKeys: AgentMemoryKey[];
  wakeUpConfigs: AgentWakeUpConfig[];
  outboundTriggers: AgentOutboundTrigger[];
  websiteTools: AgentWebsiteTool[];
  imageGenerateTools: AgentImageGenerateTool[];
  handoffTools: AgentHandoffTool[];
  mcpConfigs: AgentMcpConfig[];

  paywallConfig: AgentPaywallConfig | null;
  creditSettings: AgentCreditSettings | null;

  // Metadata
  owner: PublicUser | null;
  sharings: PublicUser[];
  phoneNumbers: AgentWhatsAppPhoneNumber[];
  totalMessages: number;
  totalSessions: number;
  /** Shareable URL that connects this agent to a new contact via WhatsApp. */
  connectUrl: string;
  ownerActive: boolean;

  createdAt: ISODateTime;
}

// =============================================================================
// Inputs
// =============================================================================

/** Input for `POST /agents/`. */
export interface CreateAgentInput {
  /** Display name for the agent (max 255 characters). */
  name: string;
}

/** Input for `POST /agents/byoa/` (Bring Your Own Agent). */
export interface CreateBYOAAgentInput {
  /** The webhook URL Wassist will forward inbound messages to. */
  webhookUrl: string;
}

/**
 * Input for `PATCH /agents/{id}/`.
 *
 * Every field is optional; only the fields you include are updated. Nested
 * sub-resource arrays are fully replaced when supplied (Wassist diffs them
 * server-side by `id`).
 */
export interface UpdateAgentInput {
  name?: string;
  description?: string;
  systemPrompt?: string;
  firstMessage?: string;
  icebreakers?: string[];
  llmModel?: string | null;

  tools?: AgentToolInput[];
  memoryKeys?: AgentMemoryKeyInput[];
  wakeUpConfigs?: AgentWakeUpConfigInput[];
  outboundTriggers?: AgentOutboundTriggerInput[];
  websiteTools?: AgentWebsiteToolInput[];
  imageGenerateTools?: AgentImageGenerateToolInput[];
  handoffTools?: AgentHandoffToolInput[];
  mcpConfigs?: AgentMcpConfigInput[];

  paywallConfig?: AgentPaywallConfigInput | null;
  creditSettings?: AgentCreditSettingsInput | null;
}

export interface AgentToolInput {
  id?: UUID;
  name: string;
  description: string;
  apiSchema: Record<string, unknown>;
  active?: boolean;
  creditCost?: number;
}

export interface AgentMemoryKeyInput {
  id?: UUID;
  key: string;
  type: 'string' | 'number' | 'boolean' | 'json';
  initialValue: string;
  whenToUpdate: string;
}

export interface AgentWakeUpConfigInput {
  id?: UUID;
  description: string;
  enabled?: boolean;
  forceMessage?: boolean;
}

export interface AgentOutboundTriggerInput {
  id?: UUID;
  enabled?: boolean;
  templateId: string;
  templateName: string;
}

export interface AgentWebsiteToolInput {
  id?: UUID;
  url: string;
  prompt: string;
  active?: boolean;
}

export interface AgentImageGenerateToolInput {
  id?: UUID;
  name: string;
  description: string;
  prompt: string;
  active?: boolean;
  creditCost?: number;
}

export interface AgentHandoffToolInput {
  id?: UUID;
  childAgentId: UUID;
  description: string;
  active?: boolean;
}

export interface AgentMcpConfigInput {
  id?: UUID;
  connectorId: UUID;
  toolWhitelist?: string[];
}

export interface AgentPaywallConfigInput {
  messageLimit?: number | null;
  paywallAction?: 'none' | 'purchase_link' | 'subscribe' | 'terminal';
  paywallUrl?: string | null;
  ctaButtonText?: string;
  terminalStateMessage?: string;
  subscriptionPricePerMonth?: number | null;
}

export interface AgentCreditSettingsInput {
  initialCredits?: number;
  creditGrantPassword?: string | null;
  creditGrantAmount?: number;
}
