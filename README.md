# Wassist SDK

The TypeScript client for the [Wassist API](https://docs.wassist.app/api-reference). Build WhatsApp agents, send messages, manage templates, and verify webhooks from any modern JavaScript runtime.

[![npm version](https://img.shields.io/npm/v/@wassist/sdk.svg)](https://www.npmjs.com/package/@wassist/sdk)

## Installation

```bash
npm install @wassist/sdk
```

Requires Node.js >= 18, or any runtime with a global `fetch` (Deno, Bun, Cloudflare Workers, Vercel Edge, modern browsers).

## Quickstart

```ts
import { Wassist } from '@wassist/sdk';

const wassist = new Wassist({ apiKey: process.env.WASSIST_API_KEY! });

// Create an agent
const agent = await wassist.agents.create({ name: 'Sales Assistant' });

// Configure it
await wassist.agents.update(agent.id, {
  systemPrompt: 'You help customers pick the right product.',
  firstMessage: 'Hi! How can I help today?',
});

// Start a conversation
const conversation = await wassist.conversations.create({
  toNumber: '+447700900100',
  agentId: agent.id,
});

// Send a message
await wassist.conversations.messages.send(conversation.id, {
  type: 'text',
  text: { body: 'Hello!' },
});

// Walk every conversation lazily
for await (const c of wassist.conversations.list()) {
  console.log(c.id, c.lastMessage?.body);
}
```

Get your API key at [wassist.app/settings](https://wassist.app/settings).

## Examples

Runnable, self-contained examples live in [`examples/`](https://github.com/wassist/sdk/tree/main/examples). Each one is its own mini-package — `cd` in, install, and go.

| Example | What it shows | Deploy |
|---------|---------------|--------|
| [`quickstart-setup-agent`](https://github.com/wassist/sdk/tree/main/examples/quickstart-setup-agent) | One-shot script: create an agent, configure prompts and icebreakers, optionally connect a phone number. | — |
| [`webhook-receiver-vercel`](https://github.com/wassist/sdk/tree/main/examples/webhook-receiver-vercel) | Next.js App Router route that verifies Wassist webhooks and echoes inbound messages. | [![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fwassist%2Fsdk&root-directory=examples%2Fwebhook-receiver-vercel&project-name=wassist-webhook-vercel&env=WASSIST_API_KEY,WASSIST_WEBHOOK_SECRET) |
| [`webhook-receiver-cloudflare`](https://github.com/wassist/sdk/tree/main/examples/webhook-receiver-cloudflare) | Cloudflare Worker that verifies Wassist webhooks via Web Crypto and echoes inbound messages. | [![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/wassist/sdk/tree/main/examples/webhook-receiver-cloudflare&secrets=WASSIST_API_KEY,WASSIST_WEBHOOK_SECRET) |

## Configuration

```ts
const wassist = new Wassist({
  apiKey: process.env.WASSIST_API_KEY!,    // required
  baseUrl: 'https://backend.wassist.app',  // default
  timeout: 60_000,                         // ms; default 60s
  maxRetries: 2,                           // default 2 (so 3 attempts total)
  fetch: customFetch,                      // optional override
});
```

## Resources

| Namespace | Methods |
|-----------|---------|
| `wassist.agents` | `list`, `get`, `create`, `createBYOA`, `update`, `delete` |
| `wassist.conversations` | `list`, `get`, `create`, `read`, `typing`, `prompt`, `subscribe`, `unsubscribe` |
| `wassist.conversations.messages` | `list`, `send` |
| `wassist.phoneNumbers` | `list`, `getBusinessProfile`, `subscribe`, `connectAgent`, `unsubscribe` |
| `wassist.whatsappAccounts` | `list`, `get`, `addNumber`, `availableNumbers` |
| `wassist.whatsappLinkSessions` | `list`, `get`, `create`, `expire` |
| `wassist.whatsappTemplates` | `list`, `get`, `create`, `update`, `delete`, `publish`, `unpublish` |
| `wassist.webhooks` | `constructEvent`, `constructEventAsync` |

Every method is fully typed against the [public API reference](https://docs.wassist.app/api-reference) — your editor knows every field on every input and response.

## Pagination

List methods return a lazy `AutoPaginatedList<T>`. Use `for await` to walk all pages, or `.firstPage()` for a single page.

```ts
// Iterate every conversation (pages are fetched on demand)
for await (const conv of wassist.conversations.list({ limit: 100 })) {
  // ...
}

// One page at a time
const { data, hasMore, nextOffset } = await wassist.conversations
  .list({ limit: 20 })
  .firstPage();

// Eagerly collect everything (small lists only)
const allAgents = await wassist.agents.list().all();
```

## Errors

Every API failure throws a typed subclass of `WassistError`. Branch on `instanceof` to handle each case.

```ts
import {
  WassistError,
  WassistAuthenticationError,
  WassistInvalidRequestError,
  WassistNotFoundError,
  WassistRateLimitError,
  WassistTimeoutError,
} from '@wassist/sdk';

try {
  await wassist.agents.get('not-a-real-id');
} catch (err) {
  if (err instanceof WassistAuthenticationError) {
    // 401 — bad/missing API key
  } else if (err instanceof WassistNotFoundError) {
    // 404
  } else if (err instanceof WassistRateLimitError) {
    console.log('retry after', err.retryAfter, 'seconds');
  } else if (err instanceof WassistInvalidRequestError) {
    // 400 / 422
  } else if (err instanceof WassistTimeoutError) {
    // request didn't complete within `timeout` ms
  } else if (err instanceof WassistError) {
    console.log(err.statusCode, err.code, err.requestId, err.raw);
  }
}
```

Every error carries `statusCode`, `code`, and the `requestId` from the `X-Request-Id` response header — quote it when filing support tickets.

## Retries and idempotency

The SDK automatically retries `429`, `408`, `425`, `5xx`, and network failures with exponential backoff + jitter. `Retry-After` headers on `429` are honored.

For mutations that need to be safe against retries, pass an `idempotencyKey`:

```ts
import { randomUUID } from 'node:crypto';

const conv = await wassist.conversations.create(
  { toNumber: '+447700900100', agentId },
  { idempotencyKey: randomUUID() }
);
```

The key is forwarded as the `Idempotency-Key` header; the server deduplicates within a 24-hour window.

You can also tune retries and timeouts per call:

```ts
await wassist.agents.list({}, { timeout: 5_000, maxRetries: 0 });
```

And cancel any request:

```ts
const controller = new AbortController();
setTimeout(() => controller.abort(), 1000);
await wassist.agents.list({}, { signal: controller.signal });
```

## Webhook signature verification

Wassist signs every webhook delivery with HMAC-SHA256 using the Stripe-style `t=<unix>,v1=<hex>` header format. The SDK gives you a one-liner to verify it.

### Node.js / Express

```ts
import express from 'express';
import { Wassist, WassistSignatureVerificationError, type WassistEvent } from '@wassist/sdk';

const app = express();

app.post(
  '/webhooks/wassist',
  express.raw({ type: 'application/json' }),
  (req, res) => {
    let event: WassistEvent;
    try {
      event = Wassist.webhooks.constructEvent(
        req.body,                                      // raw Buffer — DON'T parse first
        req.header('x-wassist-signature') ?? '',
        process.env.WASSIST_WEBHOOK_SECRET!
      );
    } catch (err) {
      if (err instanceof WassistSignatureVerificationError) {
        return res.status(400).send(err.message);
      }
      throw err;
    }

    switch (event.event) {
      case 'message.received':
        // event.message, event.from, event.conversationId, ...
        break;
      case 'subscription.message.received':
        // Same shape as message.received plus event.routing ('webhook')
        // and event.webhookId. Fires for conversations routed to a webhook
        // instead of an agent — see https://docs.wassist.app/guides/webhooks/routing
        break;
      case 'subscription.activated':
      case 'subscription.revoked':
        // event.webhookId, event.conversationId
        break;
      case 'test.ping':
        // dashboard "Send test event" button
        break;
    }
    res.status(200).send('ok');
  }
);
```

### Cloudflare Workers / Deno / Edge runtimes

Use the async variant — it runs entirely on Web Crypto:

```ts
export default {
  async fetch(request: Request, env: { WASSIST_WEBHOOK_SECRET: string }) {
    const body = await request.text();
    try {
      const event = await Wassist.webhooks.constructEventAsync(
        body,
        request.headers.get('x-wassist-signature'),
        env.WASSIST_WEBHOOK_SECRET
      );
      // ... handle event
      return new Response('ok');
    } catch {
      return new Response('bad signature', { status: 400 });
    }
  },
};
```

### Replay protection

By default the SDK rejects events whose timestamp is more than **300 seconds** off from now. Tune or disable:

```ts
Wassist.webhooks.constructEvent(body, header, secret, { tolerance: 600 });
Wassist.webhooks.constructEvent(body, header, secret, { tolerance: 0 }); // off (not recommended)
```

## Custom fetch / runtimes

The SDK uses `globalThis.fetch` by default. Inject your own — for tests, retries, tracing, or older Node:

```ts
const wassist = new Wassist({
  apiKey: '...',
  fetch: async (url, init) => {
    console.log('->', init?.method ?? 'GET', url);
    return fetch(url, init);
  },
});
```

## TypeScript

The package is published with full `.d.ts` types. Every response, input, and event is typed against the public Wassist API:

```ts
import type {
  Agent,
  Conversation,
  Message,
  PhoneNumber,
  WhatsAppAccount,
  WhatsAppTemplate,
  WhatsAppLinkSession,
  WassistEvent,
  MessageReceivedEvent,
} from '@wassist/sdk';
```

## Support

- Documentation: [docs.wassist.app/api-reference](https://docs.wassist.app/api-reference)
- Email: [contact@wassist.app](mailto:contact@wassist.app)
- Issues: [github.com/wassist/sdk/issues](https://github.com/wassist/sdk/issues)

## License

MIT
