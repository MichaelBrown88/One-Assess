/**
 * Per-org API keys: `oa_live_{keyId}_{secret}`. Only a SHA-256 hash of the secret is stored;
 * the full key is shown to the admin once, at creation.
 */
import { createHash, randomBytes, timingSafeEqual } from 'crypto';

const PREFIX = 'oa_live_';
const KEY_ID_BYTES = 9;
const SECRET_BYTES = 32;
const KEY_PATTERN = /^oa_live_([A-Za-z0-9]{12})_([A-Za-z0-9_-]{43})$/;

export type NewApiKey = { keyId: string; plaintext: string; secretHash: string; preview: string };

/** Alphanumeric key id (base64url minus '-'/'_' so the key splits cleanly on '_'). */
function randomId(): string {
  let id = '';
  while (id.length < 12) id += randomBytes(KEY_ID_BYTES).toString('base64url').replace(/[-_]/g, '');
  return id.slice(0, 12);
}

export function hashSecret(secret: string): string {
  return createHash('sha256').update(secret).digest('hex');
}

export function generateApiKey(): NewApiKey {
  const keyId = randomId();
  const secret = randomBytes(SECRET_BYTES).toString('base64url');
  return { keyId, plaintext: `${PREFIX}${keyId}_${secret}`, secretHash: hashSecret(secret), preview: `${PREFIX}${keyId}_…${secret.slice(-4)}` };
}

/** Reads `Authorization: Bearer oa_live_…`. */
export function parseApiKey(authorization: string | undefined): { keyId: string; secret: string } | null {
  const match = /^Bearer\s+(\S+)$/i.exec(authorization?.trim() ?? '');
  const parts = match ? KEY_PATTERN.exec(match[1]) : null;
  return parts ? { keyId: parts[1], secret: parts[2] } : null;
}

export function secretMatches(secret: string, storedHash: string): boolean {
  const given = Buffer.from(hashSecret(secret), 'hex');
  const stored = Buffer.from(storedHash, 'hex');
  return given.length === stored.length && timingSafeEqual(given, stored);
}
