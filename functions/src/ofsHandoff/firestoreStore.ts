/**
 * firebase-admin implementation of HandoffStore (paths match src/lib/database/paths.ts).
 */
import { FieldValue, type Firestore } from 'firebase-admin/firestore';
import type { HandoffStore } from './handler';
import type { DraftLike } from './mergeDraft';

const ALREADY_EXISTS = 6;
/** Server-only collection; no client rule grants access. Configure a TTL policy on `expiresAt`. */
export const NONCE_COLLECTION = 'integrations/ofsHandoff/nonces';

export function firestoreHandoffStore(db: Firestore): HandoffStore {
  return {
    async claimNonce(nonce, expiresAt) {
      try {
        await db.collection(NONCE_COLLECTION).doc(nonce).create({ expiresAt, createdAt: FieldValue.serverTimestamp() });
        return true;
      } catch (error) {
        if ((error as { code?: number }).code === ALREADY_EXISTS) return false;
        throw error;
      }
    },

    async findCoachUidByEmail(orgId, email) {
      const snap = await db.collection(`organizations/${orgId}/coaches`).where('email', '==', email).limit(5).get();
      const active = snap.docs.find((doc) => (doc.get('status') ?? 'active') === 'active');
      return active ? (active.get('uid') as string | undefined) ?? active.id : null;
    },

    async applyHandoff(orgId, slug, build) {
      const clientRef = db.doc(`organizations/${orgId}/clients/${slug}`);
      const draftRef = db.doc(`organizations/${orgId}/clients/${slug}/assessmentDrafts/draft`);
      return db.runTransaction(async (tx) => {
        const [clientSnap, draftSnap] = await Promise.all([tx.get(clientRef), tx.get(draftRef)]);
        const result = build(clientSnap.exists ? clientSnap.data() ?? {} : null, draftSnap.exists ? (draftSnap.data() as DraftLike) : null);
        if (result.kind === 'conflict') return result;
        const now = FieldValue.serverTimestamp();
        if (result.newClient) tx.create(clientRef, { ...result.newClient, createdAt: now });
        tx.set(clientRef, { hasAssessmentDraft: true, draftUpdatedAt: now }, { merge: true });
        const { formData, activePhaseId, activePhaseIdx, importKey, externalImport } = result.draft;
        tx.set(draftRef, {
          clientName: formData.fullName,
          organizationId: orgId,
          formData,
          updatedAt: now,
          [importKey]: externalImport,
          ...(activePhaseId ? { activePhaseId } : {}),
          ...(typeof activePhaseIdx === 'number' ? { activePhaseIdx } : {}),
        }, { merge: true });
        return { kind: 'ok' as const, created: Boolean(result.newClient) };
      });
    },
  };
}
