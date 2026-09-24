# @wassist/sdk examples

Self-contained, runnable examples for the [Wassist SDK](../README.md). Each folder is its own mini-package — `cd` in, install, and go.

| Example | What it shows | Deploy |
|---------|---------------|--------|
| [`quickstart-setup-agent/`](quickstart-setup-agent/) | A one-shot script that creates an agent, configures its prompts and icebreakers, and (optionally) connects it to a phone number on your account. | — |
| [`webhook-receiver-vercel/`](webhook-receiver-vercel/) | A Next.js App Router app that verifies Wassist webhooks and echoes inbound messages back to the contact. | [![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fwassist%2Fsdk&root-directory=examples%2Fwebhook-receiver-vercel&project-name=wassist-webhook-vercel&env=WASSIST_API_KEY,WASSIST_WEBHOOK_SECRET) |
| [`app-mcp-server/`](app-mcp-server/) | A Wassist App: an MCP server that verifies the context in each tool call's `_meta`, and resolves the session to its channel through the Wassist API. | — |
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

Each example depends on `@wassist/sdk` from npm so the deploy buttons just work. Inside this repo, each example's `tsconfig.json` maps `@wassist/sdk` to the SDK source in `../../src` through `paths`, so `tsc`, `tsx`, Wrangler and your editor's go-to-definition all use the code you're working on, with no build step.

When `../../src` doesn't exist (a deployed or copied example), the mapping misses and resolution falls back to the npm package in `node_modules`.
