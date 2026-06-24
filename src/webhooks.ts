/**
 * Webhook signature verification.
 *
 * Implements the Stripe-style `t=<unix>,v1=<hex hmac sha256>` scheme
 * documented at https://wassist.com/concepts/webhooks. Compute the HMAC of
 * `<timestamp>.<raw body>` with your webhook's signing secret and compare
 * it (in constant time) to the `v1` component of `X-Wassist-Signature`.
 *
 * This module exposes two helpers:
 *
 *  - {@link Webhooks.constructEvent} — synchronous, uses `node:crypto` when
 *    available (Node 18+).
 *  - {@link Webhooks.constructEventAsync} — uses Web Crypto (`crypto.subtle`)
 *    for runtimes that lack `node:crypto` (Cloudflare Workers, Deno, the
 *    browser).
 */

import { WassistSignatureVerificationError } from './errors';
import type { WassistEvent } from './types/events';

const DEFAULT_TOLERANCE_SECONDS = 300;

interface VerifyOptions {
  /**
   * Maximum allowed difference between the server timestamp and `now`, in
   * seconds. Pass `0` to disable replay protection (not recommended).
   *
   * @default 300
   */
  tolerance?: number;
  /**
   * Override `now` for testing — defaults to `Date.now() / 1000`.
   * @internal
   */
  currentTimestamp?: number;
}

/**
 * Stripe-style webhook helpers.
 *
 * Use via the SDK class:
 *
 * ```ts
 * import { Wassist } from '@wassist/sdk';
 *
 * const wassist = new Wassist({ apiKey: process.env.WASSIST_API_KEY! });
 * const event = wassist.webhooks.constructEvent(rawBody, sigHeader, secret);
 * ```
 *
 * Or statically — no instance required for verification:
 *
 * ```ts
 * import { Wassist } from '@wassist/sdk';
 * const event = Wassist.webhooks.constructEvent(rawBody, sigHeader, secret);
 * ```
 */
export class Webhooks {
  /**
   * Verify the signature on a webhook delivery, parse the body, and return
   * the typed event.
   *
   * @param payload      The raw request body, exactly as received — `string`,
   *                     `Buffer`, or `Uint8Array`. **Do not parse it first;**
   *                     even whitespace differences will break verification.
   * @param header       The `X-Wassist-Signature` header value.
   * @param secret       Your webhook signing secret. Find it in the
   *                     [Wassist dashboard](https://wassist.app/developers/webhooks).
   * @param options.tolerance  Replay-protection window in seconds (default 300).
   * @throws {WassistSignatureVerificationError} When the header is malformed,
   *  the HMAC doesn't match, or the timestamp is outside the tolerance window.
   */
  constructEvent(
    payload: string | Uint8Array,
    header: string | null | undefined,
    secret: string,
    options: VerifyOptions = {}
  ): WassistEvent {
    const { signedPayload, parts } = this.prepare(payload, header);
    const expected = this.signSync(signedPayload, secret);
    this.assertValid(parts, expected, header ?? '', signedPayload, options);
    return this.parseEvent(payload);
  }

  /**
   * Async variant of {@link constructEvent} that uses Web Crypto, for
   * runtimes that don't expose `node:crypto` (Cloudflare Workers, Deno,
   * the browser).
   */
  async constructEventAsync(
    payload: string | Uint8Array,
    header: string | null | undefined,
    secret: string,
    options: VerifyOptions = {}
  ): Promise<WassistEvent> {
    const { signedPayload, parts } = this.prepare(payload, header);
    const expected = await this.signAsync(signedPayload, secret);
    this.assertValid(parts, expected, header ?? '', signedPayload, options);
    return this.parseEvent(payload);
  }

  /**
   * Compute the v1 signature for a `t.<body>` payload — exported as a
   * convenience for testing.
   */
  signSync(signedPayload: string, secret: string): string {
    const nodeCrypto = loadNodeCrypto();
    if (!nodeCrypto) {
      throw new WassistSignatureVerificationError({
        message:
          'node:crypto is unavailable in this runtime. Use `constructEventAsync` instead.',
      });
    }
    return nodeCrypto.createHmac('sha256', secret).update(signedPayload).digest('hex');
  }

  /**
   * Web Crypto variant of {@link signSync}.
   */
  async signAsync(signedPayload: string, secret: string): Promise<string> {
    const subtle = globalThis.crypto?.subtle;
    if (!subtle) {
      throw new WassistSignatureVerificationError({
        message:
          'Web Crypto (`globalThis.crypto.subtle`) is unavailable in this runtime.',
      });
    }
    const enc = new TextEncoder();
    const key = await subtle.importKey(
      'raw',
      enc.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const sig = await subtle.sign('HMAC', key, enc.encode(signedPayload));
    return toHex(new Uint8Array(sig));
  }

  // =============================================================================
  // Internals
  // =============================================================================

  private prepare(
    payload: string | Uint8Array,
    header: string | null | undefined
  ): { signedPayload: string; parts: { t: string; v1: string } } {
    if (!header) {
      throw new WassistSignatureVerificationError({
        message: 'Missing X-Wassist-Signature header.',
        header: header ?? undefined,
      });
    }
    const parts = parseHeader(header);
    if (!parts.t || !parts.v1) {
      throw new WassistSignatureVerificationError({
        message:
          'Malformed X-Wassist-Signature header — expected `t=<unix>,v1=<hex>`.',
        header,
      });
    }
    const bodyText = typeof payload === 'string' ? payload : new TextDecoder().decode(payload);
    return { signedPayload: `${parts.t}.${bodyText}`, parts: parts as { t: string; v1: string } };
  }

  private assertValid(
    parts: { t: string; v1: string },
    expected: string,
    header: string,
    signedPayload: string,
    options: VerifyOptions
  ): void {
    if (!constantTimeEqualsHex(parts.v1, expected)) {
      throw new WassistSignatureVerificationError({
        message: 'Webhook signature did not match the expected value.',
        header,
        payload: signedPayload,
      });
    }
    const tolerance = options.tolerance ?? DEFAULT_TOLERANCE_SECONDS;
    if (tolerance > 0) {
      const now = options.currentTimestamp ?? Math.floor(Date.now() / 1000);
      const ts = Number(parts.t);
      if (!Number.isFinite(ts)) {
        throw new WassistSignatureVerificationError({
          message: `Invalid timestamp in X-Wassist-Signature: ${parts.t}`,
          header,
        });
      }
      if (Math.abs(now - ts) > tolerance) {
        throw new WassistSignatureVerificationError({
          message: `Webhook timestamp is outside the ${tolerance}s tolerance window (received ${ts}, now ${now}).`,
          header,
        });
      }
    }
  }

  private parseEvent(payload: string | Uint8Array): WassistEvent {
    const text =
      typeof payload === 'string' ? payload : new TextDecoder().decode(payload);
    try {
      return JSON.parse(text) as WassistEvent;
    } catch (err) {
      throw new WassistSignatureVerificationError({
        message: 'Failed to parse webhook payload as JSON.',
        payload: text,
        cause: err,
      });
    }
  }
}

// =============================================================================
// Module-level helpers
// =============================================================================

function parseHeader(header: string): Partial<{ t: string; v1: string }> {
  const parts: Partial<Record<string, string>> = {};
  for (const segment of header.split(',')) {
    const eq = segment.indexOf('=');
    if (eq === -1) continue;
    const key = segment.slice(0, eq).trim();
    const value = segment.slice(eq + 1).trim();
    if (key === 't' || key === 'v1') parts[key] = value;
  }
  return parts as Partial<{ t: string; v1: string }>;
}

function constantTimeEqualsHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

function toHex(bytes: Uint8Array): string {
  let out = '';
  for (let i = 0; i < bytes.length; i++) {
    const v = bytes[i] ?? 0;
    out += v.toString(16).padStart(2, '0');
  }
  return out;
}

/**
 * The singleton `webhooks` namespace exposed on the {@link Wassist} class.
 * Statically importable for stateless use.
 */
export const webhooks = new Webhooks();

// =============================================================================
// node:crypto loader
// =============================================================================

type NodeCrypto = {
  createHmac: (alg: string, key: string) => {
    update: (data: string) => { digest: (enc: 'hex') => string };
  };
};

let cachedNodeCrypto: NodeCrypto | null | undefined;

/**
 * `__sdkRequire` is injected by the tsup banner — see `tsup.config.ts`.
 * In ESM it's a `createRequire(import.meta.url)`; in CJS it's the
 * ambient `require`. Both can resolve `node:crypto` synchronously.
 *
 * @internal
 */
declare const __sdkRequire: ((id: string) => unknown) | undefined;

/**
 * Lazily load `node:crypto` without forcing it into the dep graph for
 * runtimes that lack it (Cloudflare Workers, the browser). Returns
 * `undefined` if `node:crypto` cannot be resolved; the caller falls back
 * to {@link Webhooks.constructEventAsync}.
 *
 * @internal
 */
function loadNodeCrypto(): NodeCrypto | undefined {
  if (cachedNodeCrypto !== undefined) return cachedNodeCrypto ?? undefined;
  try {
    const req: ((id: string) => unknown) | undefined =
      typeof __sdkRequire === 'function'
        ? __sdkRequire
        : (globalThis as { require?: (id: string) => unknown }).require;
    cachedNodeCrypto = (req?.('node:crypto') as NodeCrypto | undefined) ?? null;
  } catch {
    cachedNodeCrypto = null;
  }
  return cachedNodeCrypto ?? undefined;
}
