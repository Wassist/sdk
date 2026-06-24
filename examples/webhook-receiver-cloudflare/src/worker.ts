/**
 * Wassist webhook receiver — Cloudflare Worker.
 *
 * Uses constructEventAsync (Web Crypto) so it works on edge runtimes.
 * Echoes inbound messages back via wassist.conversations.messages.send.
 */

import { Wassist } from '@wassist/sdk';

export interface Env {
  WASSIST_API_KEY: string;
  WASSIST_WEBHOOK_SECRET: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const raw = await request.text();
    const signature = request.headers.get('x-wassist-signature');

    const event = await Wassist.webhooks.constructEventAsync(raw, signature, env.WASSIST_WEBHOOK_SECRET);

    switch (event.event) {
      case 'message.received': {
        const wassist = new Wassist({ apiKey: env.WASSIST_API_KEY, baseUrl: 'http://localhost:8050' });

        await wassist.conversations.read(event.conversationId);

        await wassist.conversations.messages.send(event.conversationId, {
          type: 'text',
          text: { body: `You said: ${event.message.body}` },
        });
        break;
      }
      default:
        console.log('[wassist] unhandled event', event.event);
    }

    return new Response('ok', { status: 200 });
  },
};
