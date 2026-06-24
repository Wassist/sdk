/**
 * @wassist/sdk
 *
 * The TypeScript client for the Wassist API.
 *
 * @example
 * ```ts
 * import { Wassist } from '@wassist/sdk';
 *
 * const wassist = new Wassist({ apiKey: process.env.WASSIST_API_KEY! });
 *
 * const agent = await wassist.agents.create({ name: 'Sales Assistant' });
 *
 * await wassist.conversations.messages.send(conversationId, {
 *   type: 'text',
 *   text: { body: 'Hello!' },
 * });
 *
 * for await (const conv of wassist.conversations.list()) {
 *   console.log(conv.id);
 * }
 * ```
 */

export { Wassist } from './client';
export type { WassistClientConfig, FetchLike } from './http';

// Pagination
export { AutoPaginatedList, type Page } from './pagination';

// Webhook helpers
export { Webhooks } from './webhooks';

// Resource classes — exported for type-only use (e.g. dependency injection)
export { AgentsResource } from './resources/agents';
export { ConversationsResource } from './resources/conversations';
export { MessagesResource } from './resources/messages';
export { PhoneNumbersResource } from './resources/phone-numbers';
export { WhatsAppAccountsResource } from './resources/whatsapp-accounts';
export { WhatsAppLinkSessionsResource } from './resources/whatsapp-link-sessions';
export { WhatsAppTemplatesResource } from './resources/whatsapp-templates';

// Errors
export {
  WassistError,
  WassistAuthenticationError,
  WassistPermissionError,
  WassistInvalidRequestError,
  WassistNotFoundError,
  WassistConflictError,
  WassistRateLimitError,
  WassistAPIError,
  WassistConnectionError,
  WassistTimeoutError,
  WassistSignatureVerificationError,
  type WassistErrorOptions,
} from './errors';

// Types
export * from './types';

// Version
export { SDK_VERSION } from './version';
