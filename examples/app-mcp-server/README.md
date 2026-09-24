# Wassist App: MCP server

A minimal [Wassist App](../../../../docs/apps/README.md): an Express + MCP TypeScript SDK server with two tools. It shows how to:

- verify the context token Wassist puts in every tool call's `_meta`;
- resolve the session in `_meta` to its channel (a WhatsApp conversation, or a dashboard simulation while testing) and read it through the Wassist API with the app's client credentials;
- verify the signed redirect to your setup URL.

## Run it

```bash
cp .env.example .env   # WASSIST_CLIENT_ID, WASSIST_CLIENT_SECRET
npm install
npm start
```

Expose it with a tunnel (for example `cloudflared tunnel --url http://localhost:3000`) and put `https://<tunnel>/mcp` in your app's configuration under **Settings → Developers → Apps**. Against a local Wassist backend (`DEBUG` on) you can use `http://localhost:3000/mcp` directly, and set `WASSIST_API_URL` (for example `http://localhost:8050`) so the API calls go to that backend instead of production.

Set **Who logs in** to **Nobody** (`"auth": "none"` in the manifest): this server has no OAuth.

## Authentication

With `"auth": "none"`, Wassist calls your server without an access token. Every tool call still carries a context token signed with your client secret, and `wassist.verifyContextToken` rejects anything Wassist didn't sign for your app, so that's what the tools check. The token's `organizationId` tells you which installing organisation (and so which of your accounts) the call is for.

To act on a specific person's account in your system, switch to `installer` or `end_customer` auth. Wassist then becomes an OAuth client of your server, following the [MCP authorization spec](https://modelcontextprotocol.io/specification/basic/authorization). Your server needs an authorization server that Wassist can discover at `/.well-known/oauth-authorization-server`, with either dynamic client registration or a client you registered for Wassist (put its `client_id` in the app's OAuth settings). With dynamic registration Wassist registers its own redirect URIs. For a client you registered, allow your app's redirect URI, which is shown in the app's OAuth settings:

```
https://backend.wassist.app/api/v1/apps/<your app id>/oauth/callback/
```

Then protect `/mcp` with the MCP SDK's `requireBearerAuth` middleware and a `verifyAccessToken` that checks the token with your authorization server; the tool handlers read who it belongs to from `extra.authInfo`. The MCP SDK's `mcpAuthRouter` or a hosted provider (Auth0, WorkOS, Stytch, …) can serve the authorization endpoints.
