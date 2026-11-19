import { httpsCallable } from 'firebase/functions';
import { collection, getDocs, limit, query, type Timestamp } from 'firebase/firestore';
import { getDb, getFirebaseFunctions } from '@/services/firebase';

export type ApiKeySummary = {
  keyId: string;
  name: string;
  preview: string;
  createdAtMs: number | null;
  lastUsedAtMs: number | null;
  revoked: boolean;
};

const API_KEYS_LIMIT = 50;
const ms = (t: unknown) => (t && typeof (t as Timestamp).toMillis === 'function' ? (t as Timestamp).toMillis() : null);

export function toApiKeySummary(keyId: string, data: Record<string, unknown>): ApiKeySummary {
  return {
    keyId,
    name: typeof data.name === 'string' ? data.name : 'API key',
    preview: typeof data.preview === 'string' ? data.preview : '',
    createdAtMs: ms(data.createdAt),
    lastUsedAtMs: ms(data.lastUsedAt),
    revoked: data.revokedAt !== null && data.revokedAt !== undefined,
  };
}

export async function listApiKeys(organizationId: string): Promise<ApiKeySummary[]> {
  const snap = await getDocs(query(collection(getDb(), `organizations/${organizationId}/apiKeys`), limit(API_KEYS_LIMIT)));
  return snap.docs.map((d) => toApiKeySummary(d.id, d.data()))
    .sort((a, b) => Number(a.revoked) - Number(b.revoked) || (b.createdAtMs ?? 0) - (a.createdAtMs ?? 0));
}

/** Returns the full key — shown once, never stored by ONE ASSESS. */
export async function createApiKey(name: string): Promise<{ keyId: string; apiKey: string }> {
  const { data } = await httpsCallable<{ name: string }, { ok: true; keyId: string; apiKey: string }>(getFirebaseFunctions(), 'createApiKey')({ name });
  return { keyId: data.keyId, apiKey: data.apiKey };
}

export async function revokeApiKey(keyId: string): Promise<void> {
  await httpsCallable(getFirebaseFunctions(), 'revokeApiKey')({ keyId });
}
