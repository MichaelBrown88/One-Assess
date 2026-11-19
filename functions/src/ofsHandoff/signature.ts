/**
 * HMAC-SHA256 request signing for the OFS → ONE ASSESS hand-off.
 * Signed string: `${timestamp}.${nonce}.${rawBody}`; signature is lowercase hex.
 */
import { createHmac, timingSafeEqual } from 'crypto';

/** Requests whose timestamp is further than this from server time are refused. */
export const MAX_SKEW_MS = 5 * 60 * 1000;
const NONCE_PATTERN = /^[A-Za-z0-9_-]{16,64}$/;
const HEX_PATTERN = /^[0-9a-f]+$/i;

export type SignatureCheck = 'ok' | 'missing' | 'stale' | 'bad';

export function signHandoff(secret: string, timestamp: string, nonce: string, body: string): string {
  return createHmac('sha256', secret).update(`${timestamp}.${nonce}.${body}`).digest('hex');
}

export function verifyHandoffSignature(input: {
  secret: string;
  timestamp?: string;
  nonce?: string;
  signature?: string;
  body: string;
  nowMs: number;
}): SignatureCheck {
  const { secret, timestamp, nonce, signature, body, nowMs } = input;
  if (!secret || !timestamp || !nonce || !signature) return 'missing';
  if (!NONCE_PATTERN.test(nonce) || !HEX_PATTERN.test(signature)) return 'bad';
  const sentAt = Number(timestamp);
  if (!Number.isFinite(sentAt) || Math.abs(nowMs - sentAt) > MAX_SKEW_MS) return 'stale';
  const expected = Buffer.from(signHandoff(secret, timestamp, nonce, body), 'hex');
  const given = Buffer.from(signature, 'hex');
  return given.length === expected.length && timingSafeEqual(given, expected) ? 'ok' : 'bad';
}
