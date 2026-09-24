/**
 * A Wassist App: a stateless Streamable HTTP MCP server that Wassist agents call.
 *
 * Every tools/call from Wassist carries `_meta["wassist.app/..."]` with the
 * installation, organisation, agent and session ids, plus a context token
 * signed with your client secret. This server verifies that token, resolves
 * the session to its channel (a WhatsApp conversation, or a dashboard
 * simulation while the agent is being tested) and reads it through the
 * Wassist API with the app's client credentials.
 *
 * The app uses `"auth": "none"`, so there's no OAuth: the verified context
 * token is what proves a call came from Wassist, and its organisation id
 * says which of your accounts it's for. See the README for adding OAuth.
 */

import express from 'express';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { z } from 'zod';
import { WassistApp } from '@wassist/sdk/apps';

const wassist = new WassistApp({
  clientId: process.env.WASSIST_CLIENT_ID!,
  clientSecret: process.env.WASSIST_CLIENT_SECRET!,
  baseUrl: process.env.WASSIST_API_URL || undefined,
});

function buildServer(): McpServer {
  const server = new McpServer({ name: 'acme-loyalty', version: '1.0.0' });

  server.registerTool(
    'get_points',
    {
      title: 'Check points',
      description: "The customer's loyalty points balance and tier.",
      inputSchema: {},
    },
    async (_args, extra) => {
      // Throws unless Wassist signed it for this app, recently.
      const ctx = wassist.verifyContextToken(extra._meta);

      // A WhatsApp conversation, or a dashboard simulation while testing.
      const channel = await wassist.resolveChannel(ctx);
      let name = 'The tester';
      let contactId: string | undefined;
      if (channel.type === 'whatsapp') {
        const conversation = await channel.getConversation();
        name = conversation.contact.name ?? 'The customer';
        contactId = channel.contactId;
      }
      const balance = await pointsFor(ctx.organizationId, contactId);

      return {
        content: [{ type: 'text', text: `${name} has ${balance.points} points (${balance.tier}).` }],
      };
    }
  );

  server.registerTool(
    'redeem',
    {
      title: 'Redeem points',
      description: 'Spend points on a reward for the customer.',
      inputSchema: { reward: z.string().describe('The reward to redeem') },
    },
    async ({ reward }, extra) => {
      const ctx = wassist.verifyContextToken(extra._meta);
      const channel = await wassist.resolveChannel(ctx);
      const code = await redeemReward(
        ctx.organizationId,
        channel.type === 'whatsapp' ? channel.contactId : undefined,
        reward,
        { wassistSessionId: ctx.sessionId }
      );
      return { content: [{ type: 'text', text: `Redeemed ${reward}. Code: ${code}` }] };
    }
  );

  return server;
}

const app = express();
app.use(express.json());

// Stateless: no sessions, so every request gets its own server and transport
// and any instance behind a load balancer can answer it.
app.post('/mcp', async (req, res) => {
  const server = buildServer();
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });
  res.on('close', () => {
    void transport.close();
    void server.close();
  });
  try {
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (error) {
    console.error('MCP request failed', error);
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: '2.0',
        error: { code: -32603, message: 'Internal server error' },
        id: null,
      });
    }
  }
});

// Without sessions there is no stream to resume (GET) or session to end (DELETE).
const methodNotAllowed: express.RequestHandler = (_req, res) => {
  res.status(405).set('Allow', 'POST').json({
    jsonrpc: '2.0',
    error: { code: -32000, message: 'Method not allowed.' },
    id: null,
  });
};
app.get('/mcp', methodNotAllowed);
app.delete('/mcp', methodNotAllowed);

// Where Wassist sends the installer after they finish installing, if you set
// `setup_url`, and again whenever they click "Configure" on the installation.
// The hmac covers every query param.
app.get('/wassist/installed', (req, res) => {
  try {
    const { installationId, organizationId } = wassist.verifySetupRedirect(req.originalUrl);
    res.send(`Thanks for installing! Installation ${installationId} for organisation ${organizationId}.`);
  } catch {
    res.status(400).send('That link has expired. Open it again from Wassist.');
  }
});

app.listen(Number(process.env.PORT ?? 3000), () => {
  console.log(`MCP server listening on :${process.env.PORT ?? 3000}/mcp`);
});

// ---------------------------------------------------------------------------
// Stand-ins for your own backend.
// ---------------------------------------------------------------------------

async function pointsFor(_organizationId: string, _contactId: string | undefined) {
  return { points: 120, tier: 'gold' };
}

async function redeemReward(
  _organizationId: string,
  _contactId: string | undefined,
  _reward: string,
  _meta: { wassistSessionId: string }
) {
  return 'ACME-1234';
}
