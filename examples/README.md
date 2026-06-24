# @wassist/sdk examples

Self-contained, runnable examples for the [Wassist SDK](../README.md). Each folder is its own mini-package — `cd` in, install, and go.

| Example | What it shows | Deploy |
|---------|---------------|--------|
| [`quickstart-setup-agent/`](quickstart-setup-agent/) | A one-shot script that creates an agent, configures its prompts and icebreakers, and (optionally) connects it to a phone number on your account. | — |
| [`webhook-receiver-vercel/`](webhook-receiver-vercel/) | A Next.js App Router app that verifies Wassist webhooks and echoes inbound messages back to the contact. | [![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fwassist%2Fsdk&root-directory=examples%2Fwebhook-receiver-vercel&project-name=wassist-webhook-vercel&env=WASSIST_API_KEY,WASSIST_WEBHOOK_SECRET) |
| [`webhook-receiver-cloudflare/`](webhook-receiver-cloudflare/) | A Cloudflare Worker that verifies Wassist webhooks via Web Crypto and echoes inbound messages back to the contact. | [![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/wassist/sdk/tree/main/examples/webhook-receiver-cloudflare&secrets=WASSIST_API_KEY,WASSIST_WEBHOOK_SECRET) |

## Running an example locally

```bash
cd examples/<name>
cp .env.example .env          # or .env.local / .dev.vars depending on the example
npm install
npm start                     # or `npm run dev`
```

Each example has its own README with the exact commands.

## Concepts each example covers

- **Authentication** — every example uses an API key from `WASSIST_API_KEY`. Get one at [wassist.app/settings](https://wassist.app/settings).
- **Webhook signing** — both webhook receivers use `Wassist.webhooks.constructEvent` / `constructEventAsync` against `WASSIST_WEBHOOK_SECRET` from [wassist.app/developers/webhooks](https://wassist.app/developers/webhooks). See [docs.wassist.app/concepts/webhooks](https://docs.wassist.app/concepts/webhooks) for the wire format.
- **Sending messages** — both webhook receivers respond with `wassist.conversations.messages.send(...)` to demonstrate the full inbound-then-outbound loop.
- **Typed events** — handlers use `switch (event.event)` over the `WassistEvent` discriminated union; your editor knows every field on every branch.

## Developing against a local SDK

Each example pins `"@wassist/sdk": "^0.1.0"` from npm so the deploy buttons just work. While hacking on the SDK itself in this monorepo, swap that line to:

```json
"@wassist/sdk": "file:../.."
```

and re-run `npm install`.
