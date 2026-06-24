# Changelog

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
