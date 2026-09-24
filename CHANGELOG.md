# Changelog

## 0.3.0

- **Breaking (apps)**: apps now read context through the regular API instead of the Context API. `resolveContext` is gone, and `WassistToolContext` carries `installationId`, `organizationId`, `agentId` and `sessionId` (no more conversation, contact or message ids).
- `WassistApp.resolveChannel(ctx)` turns the session into a `WhatsAppChannel` (conversation and contact; `getConversation`, `listMessages`, `sendText`) or a `WebBuilderChannel` (dashboard simulation; `getSimulation`, `listMessages`), so tools work in both live and test runs.
- `WassistApp.client(installationId)` returns a full `Wassist` client acting for that organisation, authenticated with your client credentials; `new Wassist({ appCredentials })` does the same by hand.
- New `sessions.get` and `simulations.get` / `simulations.messages`.
- The post-install URL is now the app's **setup URL**: installers land there after installing and whenever they click "Configure". `verifySetupRedirect` (and `verifySetupRedirectAsync`) replace `verifyInstallRedirect`, which stays as a deprecated alias.
- **Fix**: `conversations.messages.list` handles the endpoint's bare-array response.

## 0.2.0

- **Wassist Apps**: `WassistApp` (also at `@wassist/sdk/apps`) for building an MCP server that Wassist organisations install. `verifyContextToken` checks the signed context in every tool call's `_meta` and returns the installation, agent, conversation and contact ids; `resolveContext` exchanges it for the conversation, agent and contact through the Context API; `verifyInstallRedirect` checks the signed redirect to your `post_install_url`. Async variants cover runtimes without `node:crypto`.
- New [`app-mcp-server`](./examples/app-mcp-server) example.

## 0.1.2

- **New event**: `subscription.message.received` is now part of the `WassistEvent` discriminated union as `SubscriptionMessageReceivedEvent`. It fires for inbound user messages on conversations whose routing has been switched to `webhook` (via `phoneNumbers.subscribe` or `conversations.subscribe`) — delivery goes only to the assigned webhook, with no agent pipeline and no fan-out. Same envelope as `message.received`, plus `routing: "webhook"` and `webhookId`. See the [routing guide](https://docs.wassist.app/guides/webhooks/routing) for the full lifecycle.
- `SDK_VERSION` now correctly tracks `package.json` (was stuck at `0.1.0`).

## 0.1.1

- **Fix**: `WassistEvent` is now a clean discriminated union — `switch (event.event)` correctly narrows every known case to its specific event type, so fields like `event.message.body` and `event.conversationId` are typed inside the branch (previously they collapsed to `unknown` because the catch-all `WassistEventBase<string> & Record<string, unknown>` member was part of the union). The catch-all has been split out into a separate, opt-in `UnrecognizedWassistEvent` type for forward-compat handling of future event names.
- Runnable [examples](./examples) for a quickstart agent setup script, a Next.js / Vercel webhook receiver, and a Cloudflare Workers webhook receiver — each with a one-click deploy button where applicable.

## 0.1.0

Initial release.

- Typed client for the public Wassist REST API: `agents`, `conversations` (+ `messages`), `phoneNumbers`, `whatsappAccounts`, `whatsappLinkSessions`, `whatsappTemplates`.
- Auto-paginating list endpoints with `for await` support and `.firstPage()`.
- Automatic retries on `429` and `5xx` with exponential backoff and `Retry-After` honoring.
- Per-call idempotency keys for `POST` mutations (`Idempotency-Key` header).
- Typed error hierarchy with `statusCode`, `code`, `requestId`, and raw response body.
- Stripe-style webhook signature verification via `wassist.webhooks.constructEvent()` (sync) and `constructEventAsync()` (Web Crypto, for edge runtimes).
