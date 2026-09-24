/**
 * Helpers for building a Wassist App: an MCP server that Wassist
 * organisations install and hand to their agents.
 *
 * - {@link WassistApp.verifyContextToken}: check the signed context Wassist
 *   puts in every `tools/call`'s `_meta`, and read the ids from it.
 * - {@link WassistApp.resolveChannel}: find out where the agent is talking
 *   (a WhatsApp conversation or a dashboard simulation).
 * - {@link WassistApp.client}: the full Wassist API, acting for one of the
 *   organisations that installed you.
 * - {@link WassistApp.verifySetupRedirect}: check the signed redirect to
 *   your setup URL (after installing, and from "Configure").
 *
 * @example
 * ```ts
 * import { WassistApp } from '@wassist/sdk/apps';
 *
 * const wassist = new WassistApp({
 *   clientId: process.env.WASSIST_CLIENT_ID!,
 *   clientSecret: process.env.WASSIST_CLIENT_SECRET!,
 * });
 *
 * server.registerTool('get_points', { description: 'Loyalty balance' }, async (_args, extra) => {
 *   const ctx = wassist.verifyContextToken(extra._meta);
 *   const channel = await wassist.resolveChannel(ctx);
 *   const messages = await channel.listMessages();
 *   return { content: [{ type: 'text', text: `Read ${messages.length} messages` }] };
 * });
 * ```
 */

import { Wassist } from './client';
import { WassistSignatureVerificationError } from './errors';
import type { FetchLike } from './http';
import type { Conversation } from './types/conversations';
import type { Message } from './types/messages';
import type { Simulation, SimulationMessage } from './types/sessions';
import { webhooks } from './webhooks';

const DEFAULT_BASE_URL = 'https://backend.wassist.app';
const CONTEXT_TOKEN_ISSUER = 'https://wassist.app';
const DEFAULT_REDIRECT_TOLERANCE_SECONDS = 300;
const DEFAULT_CLOCK_LEEWAY_SECONDS = 30;

/** Prefix of every key Wassist puts in a tool call's MCP `_meta`. */
export const WASSIST_META_PREFIX = 'wassist.app/';
/** `_meta` key holding the signed context token on a tool call. */
export const CONTEXT_TOKEN_META_KEY = `${WASSIST_META_PREFIX}context_token`;

export interface WassistAppConfig {
  clientId: string;
  clientSecret: string;
  /**
   * While you rotate your secret, Wassist keeps signing with the new one;
   * pass the old one here to keep verifying tokens minted just before.
   */
  previousClientSecret?: string;
  /** @default 'https://backend.wassist.app' */
  baseUrl?: string;
  fetch?: FetchLike;
}

/** What a verified context token tells you about the tool call. */
export interface WassistToolContext {
  /** The installation (one per organisation) the call is for. */
  installationId: string;
  organizationId: string;
  agentId: string;
  /** The agent session; resolve it with {@link WassistApp.resolveChannel}. */
  sessionId: string;
  /** Unix seconds. */
  expiresAt: number;
  token: string;
}

export interface SetupRedirect {
  installationId: string;
  organizationId: string;
  timestamp: number;
}

/** @deprecated Renamed to {@link SetupRedirect}. */
export type InstallRedirect = SetupRedirect;

interface VerifyOptions {
  /** Override `now` (unix seconds), for tests. */
  currentTimestamp?: number;
}

/** The agent is talking to a contact in a WhatsApp conversation. */
export class WhatsAppChannel {
  readonly type = 'whatsapp' as const;

  /** @internal */
  constructor(
    private readonly client: Wassist,
    readonly sessionId: string,
    readonly conversationId: string,
    readonly contactId: string
  ) {}

  getConversation(): Promise<Conversation> {
    return this.client.conversations.get(this.conversationId);
  }

  /** The most recent messages in the conversation, newest first. */
  async listMessages(options: { limit?: number } = {}): Promise<Message[]> {
    const page = await this.client.conversations.messages
      .list(this.conversationId, { limit: options.limit ?? 20 })
      .firstPage();
    return page.data;
  }

  sendText(body: string): Promise<Message> {
    return this.client.conversations.messages.send(this.conversationId, { type: 'text', text: { body } });
  }
}

/** The agent is being tested in a dashboard simulation. */
export class WebBuilderChannel {
  readonly type = 'web_builder' as const;

  /** @internal */
  constructor(
    private readonly client: Wassist,
    readonly sessionId: string,
    readonly simulationId: string
  ) {}

  getSimulation(): Promise<Simulation> {
    return this.client.simulations.get(this.simulationId);
  }

  /** Every message in the simulation, oldest first. */
  listMessages(): Promise<SimulationMessage[]> {
    return this.client.simulations.messages(this.simulationId);
  }
}

export type WassistChannel = WhatsAppChannel | WebBuilderChannel;

export class WassistApp {
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly secrets: string[];
  private readonly baseUrl: string;
  private readonly fetchImpl: FetchLike | undefined;

  constructor(config: WassistAppConfig) {
    if (!config.clientId || !config.clientSecret) {
      throw new Error('WassistApp needs both clientId and clientSecret.');
    }
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
    this.secrets = [config.clientSecret, config.previousClientSecret].filter(
      (s): s is string => !!s
    );
    this.baseUrl = (config.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, '').replace(/\/api\/v1$/, '');
    this.fetchImpl = config.fetch;
  }

  // ---------------------------------------------------------------------------
  // Context token (in every tool call's _meta)
  // ---------------------------------------------------------------------------

  /**
   * Verify the context token and return the ids it carries.
   *
   * @param source The tool call's `_meta` object (e.g. `extra._meta` in the
   *   MCP TypeScript SDK), or the token string itself.
   * @throws {WassistSignatureVerificationError} When the token is missing,
   *   malformed, not signed with your secret, for another app, or expired.
   */
  verifyContextToken(source: unknown, options: VerifyOptions = {}): WassistToolContext {
    const token = extractToken(source);
    const { signingInput, signature, payload } = splitJwt(token);
    const valid = this.secrets.some((secret) =>
      constantTimeEquals(signature, webhooks.signSync(signingInput, secret))
    );
    return this.checkClaims(valid, payload, token, options);
  }

  /** {@link verifyContextToken} for runtimes without `node:crypto` (Workers, Deno). */
  async verifyContextTokenAsync(source: unknown, options: VerifyOptions = {}): Promise<WassistToolContext> {
    const token = extractToken(source);
    const { signingInput, signature, payload } = splitJwt(token);
    let valid = false;
    for (const secret of this.secrets) {
      if (constantTimeEquals(signature, await webhooks.signAsync(signingInput, secret))) valid = true;
    }
    return this.checkClaims(valid, payload, token, options);
  }

  private checkClaims(
    valid: boolean,
    payload: Record<string, unknown>,
    token: string,
    options: VerifyOptions
  ): WassistToolContext {
    if (!valid) throw verificationError('The context token was not signed with this app\'s client secret.');
    const audience = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
    if (!audience.includes(this.clientId)) {
      throw verificationError('The context token was issued to a different app.');
    }
    if (payload.iss !== CONTEXT_TOKEN_ISSUER) throw verificationError('Unexpected context token issuer.');
    const now = options.currentTimestamp ?? Math.floor(Date.now() / 1000);
    const exp = Number(payload.exp);
    if (!Number.isFinite(exp) || exp + DEFAULT_CLOCK_LEEWAY_SECONDS < now) {
      throw verificationError('The context token has expired.');
    }
    const str = (key: string) => (typeof payload[key] === 'string' ? (payload[key] as string) : undefined);
    return {
      installationId: str('installation_id') ?? '',
      organizationId: str('organization_id') ?? '',
      agentId: str('agent_id') ?? '',
      sessionId: str('session_id') ?? '',
      expiresAt: exp,
      token,
    };
  }

  // ---------------------------------------------------------------------------
  // The Wassist API, as an installation
  // ---------------------------------------------------------------------------

  /**
   * A full Wassist API client acting for the organisation behind
   * `installationId`, authenticated with your client credentials.
   */
  client(installationId: string): Wassist {
    return new Wassist({
      appCredentials: { clientId: this.clientId, clientSecret: this.clientSecret, installationId },
      baseUrl: this.baseUrl,
      fetch: this.fetchImpl,
    });
  }

  /**
   * Where the agent behind a tool call is talking, mirroring Wassist's own
   * channels: a {@link WhatsAppChannel} for a conversation with a contact,
   * or a {@link WebBuilderChannel} when it's being tested in the dashboard.
   *
   * @param context The verified context from {@link verifyContextToken}, or a
   *   session id together with the installation it belongs to.
   */
  async resolveChannel(
    context: WassistToolContext | { sessionId: string; installationId: string }
  ): Promise<WassistChannel> {
    const client = this.client(context.installationId);
    const session = await client.sessions.get(context.sessionId);
    const channel = session.channel;
    if (channel?.type === 'whatsapp') {
      return new WhatsAppChannel(client, session.id, channel.conversationId, channel.contactId);
    }
    if (channel?.type === 'web_builder') {
      return new WebBuilderChannel(client, session.id, channel.simulationId);
    }
    throw new Error(`Session ${session.id} isn't attached to a conversation or simulation.`);
  }

  // ---------------------------------------------------------------------------
  // Setup URL redirect
  // ---------------------------------------------------------------------------

  /**
   * Verify the redirect Wassist sends an installer to your setup URL with —
   * right after they install, and whenever they click "Configure" — and
   * return which installation it is.
   *
   * @param url The full request URL, its query string, or its parsed params.
   */
  verifySetupRedirect(
    url: string | URL | URLSearchParams | Record<string, string>,
    options: VerifyOptions & { tolerance?: number } = {}
  ): SetupRedirect {
    const params = toParams(url);
    const expected = this.secrets.map((secret) => webhooks.signSync(signingString(params), secret));
    return this.checkRedirect(params, expected, options);
  }

  /** {@link verifySetupRedirect} for runtimes without `node:crypto`. */
  async verifySetupRedirectAsync(
    url: string | URL | URLSearchParams | Record<string, string>,
    options: VerifyOptions & { tolerance?: number } = {}
  ): Promise<SetupRedirect> {
    const params = toParams(url);
    const expected = await Promise.all(
      this.secrets.map((secret) => webhooks.signAsync(signingString(params), secret))
    );
    return this.checkRedirect(params, expected, options);
  }

  /** @deprecated Renamed to {@link verifySetupRedirect}. */
  verifyInstallRedirect(
    url: string | URL | URLSearchParams | Record<string, string>,
    options: VerifyOptions & { tolerance?: number } = {}
  ): SetupRedirect {
    return this.verifySetupRedirect(url, options);
  }

  /** @deprecated Renamed to {@link verifySetupRedirectAsync}. */
  verifyInstallRedirectAsync(
    url: string | URL | URLSearchParams | Record<string, string>,
    options: VerifyOptions & { tolerance?: number } = {}
  ): Promise<SetupRedirect> {
    return this.verifySetupRedirectAsync(url, options);
  }

  private checkRedirect(
    params: Record<string, string>,
    expected: string[],
    options: VerifyOptions & { tolerance?: number }
  ): SetupRedirect {
    const supplied = params.hmac ?? '';
    if (!expected.some((e) => constantTimeEquals(supplied, e))) {
      throw verificationError('The setup redirect signature did not match.');
    }
    const timestamp = Number(params.timestamp);
    const tolerance = options.tolerance ?? DEFAULT_REDIRECT_TOLERANCE_SECONDS;
    const now = options.currentTimestamp ?? Math.floor(Date.now() / 1000);
    if (!Number.isFinite(timestamp) || (tolerance > 0 && Math.abs(now - timestamp) > tolerance)) {
      throw verificationError('The setup redirect is too old; ask the installer to open it again from Wassist.');
    }
    return {
      installationId: params.installation_id ?? '',
      organizationId: params.organization_id ?? '',
      timestamp,
    };
  }
}

// =============================================================================
// Helpers
// =============================================================================

function verificationError(message: string): WassistSignatureVerificationError {
  return new WassistSignatureVerificationError({ message });
}

function extractToken(source: unknown): string {
  if (typeof source === 'string' && source) return source.replace(/^Bearer\s+/i, '');
  if (source && typeof source === 'object') {
    const value = (source as Record<string, unknown>)[CONTEXT_TOKEN_META_KEY];
    if (typeof value === 'string' && value) return value;
  }
  throw verificationError(`No Wassist context token found (expected _meta["${CONTEXT_TOKEN_META_KEY}"]).`);
}

function splitJwt(token: string): {
  signingInput: string;
  signature: string;
  payload: Record<string, unknown>;
} {
  const parts = token.split('.');
  if (parts.length !== 3) throw verificationError('The context token is not a JWT.');
  const [headerPart, payloadPart, signaturePart] = parts as [string, string, string];
  let header: Record<string, unknown>;
  let payload: Record<string, unknown>;
  try {
    header = JSON.parse(base64UrlDecode(headerPart));
    payload = JSON.parse(base64UrlDecode(payloadPart));
  } catch (cause) {
    throw new WassistSignatureVerificationError({ message: 'The context token is malformed.', cause });
  }
  if (header.alg !== 'HS256') throw verificationError('The context token must be signed with HS256.');
  return {
    signingInput: `${headerPart}.${payloadPart}`,
    signature: bytesToHex(base64UrlToBytes(signaturePart)),
    payload,
  };
}

function signingString(params: Record<string, string>): string {
  return Object.keys(params)
    .filter((key) => key !== 'hmac')
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join('&');
}

function toParams(url: string | URL | URLSearchParams | Record<string, string>): Record<string, string> {
  if (url instanceof URLSearchParams) return Object.fromEntries(url.entries());
  if (url instanceof URL) return Object.fromEntries(url.searchParams.entries());
  if (typeof url === 'string') {
    const query = url.includes('?') ? url.slice(url.indexOf('?') + 1) : url;
    return Object.fromEntries(new URLSearchParams(query).entries());
  }
  return { ...url };
}

function base64UrlToBytes(value: string): Uint8Array {
  const b64 = value.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(value.length / 4) * 4, '=');
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function base64UrlDecode(value: string): string {
  return new TextDecoder().decode(base64UrlToBytes(value));
}

function bytesToHex(bytes: Uint8Array): string {
  let out = '';
  for (let i = 0; i < bytes.length; i++) out += (bytes[i] ?? 0).toString(16).padStart(2, '0');
  return out;
}

function constantTimeEquals(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
