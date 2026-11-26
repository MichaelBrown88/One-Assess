/**
 * firebase-admin implementation of ApiStore and the key management used by org admins. Paths:
 * - apiKeys/{keyId} = { orgId, secretHash, createdBy, createdAt, lastUsedAt, revokedAt } (server-only)
 * - organizations/{org}/apiKeys/{keyId} = { name, preview, createdBy, createdAt, lastUsedAt, revokedAt } (admins read)
 * - organizations/{org}/externalClients/{provider:id} = { clientSlug, provider, externalClientId } (server-only)
 * - apiIdempotency/{keyId}:{key} = { requestHash, status, body, expiresAt } (server-only; TTL on expiresAt)
 */
import { createHash } from 'crypto';
import { intakeBindingId, sameBinding, type IntakeBinding } from './assessmentStatus';
import { refreshAssessmentStatus } from './assessmentStatusStore';
import { FieldValue, type Firestore } from 'firebase-admin/firestore';
import { assertRateLimit } from '../rateLimit';
import { intakeRefs, readIntakeTargets, writeIntakeResult } from '../intake/firestoreWrite';
import { generateApiKey } from './keys';
import type { ApiKeyRecord, ApiStore, StoredResponse } from './handler';

const MAX_ACTIVE_KEYS_PER_ORG = 10;

/** Firestore doc ids cannot contain '/', and provider names are free text: hash the pair. */
export function externalClientDocId(provider: string, externalClientId: string): string {
  return createHash('sha256').update(`${provider.toLowerCase()}\u0000${externalClientId}`).digest('hex').slice(0, 40);
}

export function firestoreApiStore(db: Firestore): ApiStore {
  return {
    getAssessmentStatus: (orgId, bindingId, host) => refreshAssessmentStatus(db, orgId, bindingId, host),
    async getKey(keyId) {
      const data = (await db.doc(`apiKeys/${keyId}`).get()).data() as ApiKeyRecord | undefined;
      return data?.orgId && data.secretHash ? data : null;
    },

    async touchKey(keyId) {
      const key = await db.doc(`apiKeys/${keyId}`).get();
      const orgId = key.get('orgId') as string | undefined;
      const batch = db.batch();
      batch.update(key.ref, { lastUsedAt: FieldValue.serverTimestamp() });
      if (orgId) batch.set(db.doc(`organizations/${orgId}/apiKeys/${keyId}`), { lastUsedAt: FieldValue.serverTimestamp() }, { merge: true });
      await batch.commit();
    },

    async allow(bucket, maxRequests, windowSeconds) {
      try {
        await assertRateLimit(db, bucket, { maxRequests, windowSeconds });
        return true;
      } catch (error) {
        if ((error as { code?: string }).code === 'RATE_LIMITED') return false;
        throw error;
      }
    },

    async getStoredResponse(keyId, idempotencyKey) {
      const snap = await db.doc(`apiIdempotency/${keyId}:${idempotencyKey}`).get();
      if (!snap.exists) return null;
      const expiresAt = snap.get('expiresAt') as { toMillis?: () => number } | undefined;
      if (expiresAt?.toMillis && expiresAt.toMillis() < Date.now()) return null;
      return snap.data() as StoredResponse;
    },

    async storeResponse(keyId, idempotencyKey, response, expiresAt) {
      await db.doc(`apiIdempotency/${keyId}:${idempotencyKey}`).set({ ...response, expiresAt });
    },

    async findCoachUidByEmail(orgId, email) {
      const snap = await db.collection(`organizations/${orgId}/coaches`).where('email', '==', email).limit(5).get();
      const active = snap.docs.find((doc) => (doc.get('status') ?? 'active') === 'active');
      return active ? ((active.get('uid') as string | undefined) ?? active.id) : null;
    },

    async findExternalClient(orgId, provider, externalClientId) {
      const snap = await db.doc(`organizations/${orgId}/externalClients/${externalClientDocId(provider, externalClientId)}`).get();
      return (snap.get('clientSlug') as string | undefined) ?? null;
    },

    async findClientsByEmail(orgId, email) {
      const snap = await db.collection(`organizations/${orgId}/clients`).where('email', '==', email).limit(10).get();
      return snap.docs.map((doc) => ({ clientSlug: doc.id, status: doc.get('status') as string | undefined }));
    },

    async applyIntake(orgId, slug, externalLink, build, binding) {
      const refs = intakeRefs(db, orgId, slug);
      return db.runTransaction(async (tx) => {
        const targets = await readIntakeTargets(tx, refs);
        const bindingRef = binding ? db.doc(`organizations/${orgId}/assessmentIntakes/${intakeBindingId(binding.provider, binding.externalAssessmentId)}`) : null;
        const existing = bindingRef ? await tx.get(bindingRef) : null;
        if (binding && existing?.exists && !sameBinding(existing.data() as IntakeBinding, binding)) return { kind: 'conflict', reason: 'client_mismatch' };
        const out = build(targets.client, targets.draft, targets.org);
        if (out.kind === 'conflict') return out;
        if (bindingRef && !existing?.exists) tx.create(bindingRef, { ...binding, createdAt: FieldValue.serverTimestamp() });
        const { created } = writeIntakeResult(tx, refs, orgId, out, targets.draft !== null);
        if (externalLink) {
          tx.set(db.doc(`organizations/${orgId}/externalClients/${externalClientDocId(externalLink.provider, externalLink.externalClientId)}`), {
            ...externalLink, clientSlug: slug, updatedAt: FieldValue.serverTimestamp(),
          });
        }
        return { kind: 'ok' as const, created };
      });
    },
  };
}

// ── Key management (org admins, via callables) ──────────────────────────

export async function createOrgApiKey(db: Firestore, orgId: string, uid: string, name: string): Promise<{ keyId: string; apiKey: string }> {
  const active = await db.collection(`organizations/${orgId}/apiKeys`).where('revokedAt', '==', null).count().get();
  if (active.data().count >= MAX_ACTIVE_KEYS_PER_ORG) throw Object.assign(new Error('too_many_keys'), { reason: 'too_many_keys' });
  const key = generateApiKey();
  const now = FieldValue.serverTimestamp();
  const batch = db.batch();
  batch.create(db.doc(`apiKeys/${key.keyId}`), { orgId, secretHash: key.secretHash, createdBy: uid, createdAt: now, revokedAt: null });
  batch.create(db.doc(`organizations/${orgId}/apiKeys/${key.keyId}`), { name, preview: key.preview, createdBy: uid, createdAt: now, lastUsedAt: null, revokedAt: null });
  await batch.commit();
  return { keyId: key.keyId, apiKey: key.plaintext };
}

export async function revokeOrgApiKey(db: Firestore, orgId: string, keyId: string): Promise<boolean> {
  const ref = db.doc(`apiKeys/${keyId}`);
  const snap = await ref.get();
  if (!snap.exists || snap.get('orgId') !== orgId) return false;
  const now = FieldValue.serverTimestamp();
  const batch = db.batch();
  batch.update(ref, { revokedAt: now });
  batch.set(db.doc(`organizations/${orgId}/apiKeys/${keyId}`), { revokedAt: now }, { merge: true });
  await batch.commit();
  return true;
}
