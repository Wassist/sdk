import { HttpClient, type WassistClientConfig } from './http';
import { AgentsResource } from './resources/agents';
import { ConversationsResource } from './resources/conversations';
import { PhoneNumbersResource } from './resources/phone-numbers';
import { WhatsAppAccountsResource } from './resources/whatsapp-accounts';
import { WhatsAppLinkSessionsResource } from './resources/whatsapp-link-sessions';
import { WhatsAppTemplatesResource } from './resources/whatsapp-templates';
import { Webhooks, webhooks as webhooksSingleton } from './webhooks';

/**
 * The Wassist API client.
 *
 * @example
 * ```ts
 * import { Wassist } from '@wassist/sdk';
 *
 * const wassist = new Wassist({ apiKey: process.env.WASSIST_API_KEY! });
 *
 * const agent = await wassist.agents.create({ name: 'Sales Assistant' });
 *
 * for await (const conv of wassist.conversations.list()) {
 *   console.log(conv.id);
 * }
 * ```
 */
export class Wassist {
  /** Create and manage AI agents. */
  readonly agents: AgentsResource;
  /** Send messages and manage conversations (with nested `messages` resource). */
  readonly conversations: ConversationsResource;
  /** Manage your connected WhatsApp phone numbers and their routing. */
  readonly phoneNumbers: PhoneNumbersResource;
  /** Manage WhatsApp Business Accounts. */
  readonly whatsappAccounts: WhatsAppAccountsResource;
  /** Manage hosted WhatsApp account-linking sessions. */
  readonly whatsappLinkSessions: WhatsAppLinkSessionsResource;
  /** Manage WhatsApp message templates. */
  readonly whatsappTemplates: WhatsAppTemplatesResource;
  /** Verify inbound webhook signatures. */
  readonly webhooks: Webhooks = webhooksSingleton;

  /**
   * Webhook helpers — usable without instantiating a client.
   *
   * @example
   * ```ts
   * const event = Wassist.webhooks.constructEvent(body, header, secret);
   * ```
   */
  static readonly webhooks: Webhooks = webhooksSingleton;

  constructor(config: WassistClientConfig) {
    const http = new HttpClient(config);
    this.agents = new AgentsResource(http);
    this.conversations = new ConversationsResource(http);
    this.phoneNumbers = new PhoneNumbersResource(http);
    this.whatsappAccounts = new WhatsAppAccountsResource(http);
    this.whatsappLinkSessions = new WhatsAppLinkSessionsResource(http);
    this.whatsappTemplates = new WhatsAppTemplatesResource(http);
  }
}
