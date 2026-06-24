# Changelog

## 0.1.0 (Unreleased)

Initial release.

- Typed client for the public Wassist REST API: `agents`, `conversations` (+ `messages`), `phoneNumbers`, `whatsappAccounts`, `whatsappLinkSessions`, `whatsappTemplates`.
- Auto-paginating list endpoints with `for await` support and `.firstPage()`.
- Automatic retries on `429` and `5xx` with exponential backoff and `Retry-After` honoring.
- Per-call idempotency keys for `POST` mutations (`Idempotency-Key` header).
- Typed error hierarchy with `statusCode`, `code`, `requestId`, and raw response body.
- Stripe-style webhook signature verification via `wassist.webhooks.constructEvent()` (sync) and `constructEventAsync()` (Web Crypto, for edge runtimes).
