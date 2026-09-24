import type { ISODateTime, UUID } from './common';

/** Where a session's agent is talking. */
export type SessionChannel =
  | {
      /** A WhatsApp conversation with a contact. */
      type: 'whatsapp';
      conversationId: UUID;
      contactId: UUID;
    }
  | {
      /** A test chat in the Wassist dashboard. */
      type: 'web_builder';
      simulationId: UUID;
    };

/** One run of an agent with one person. */
export interface Session {
  id: UUID;
  agentId: UUID;
  /** `null` when the session isn't attached to a conversation or simulation. */
  channel: SessionChannel | null;
  createdAt: ISODateTime;
}

export interface SimulationMessage {
  id: UUID;
  role: 'user' | 'assistant' | string;
  messageType: string;
  content: Record<string, unknown>;
  createdAt: ISODateTime;
}

/** A dashboard test chat with an agent. */
export interface Simulation {
  id: UUID;
  agentId: UUID;
  agentName: string;
  title: string;
  messages: SimulationMessage[];
  createdAt: ISODateTime;
  isProcessing: boolean;
}
