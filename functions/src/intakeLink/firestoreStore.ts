/**
 * firebase-admin implementation of IntakeLinkStore. Paths:
 * - organizations/{org}.intakeLink = { token, enabled, rotatedAt }
 * - intake-links/{token} = { organizationId, enabled } (server-only lookup)
 * - organizations/{org}/intakes/{id} (staff read, functions write)
 * - organizations/{org}/clients/{slug} and .../assessmentDrafts/draft
 */
import { FieldValue, type Firestore } from 'firebase-admin/firestore';
import { assertRateLimit } from '../rateLimit';
import type { IntakeDoc, IntakeLinkStore, Staff } from './handlers';
import type { DraftLike } from '../intake/mergeDraft';

const STAFF_ROLES = new Set(['org_admin', 'coach']);

export function firestoreIntakeLinkStore(db: Firestore): IntakeLinkStore {
  const orgRef = (orgId: string) => db.doc(`organizations/${orgId}`);
  const intakeRef = (orgId: string, id: string) => db.doc(`organizations/${orgId}/intakes/${id}`);

  return {
    async getStaff(uid): Promise<Staff | null> {
      const profile = (await db.doc(`user-profiles/${uid}`).get()).data() as { organizationId?: string; role?: string } | undefined;
      if (!profile?.organizationId || !profile.role || !STAFF_ROLES.has(profile.role)) return null;
      const coach = await db.doc(`organizations/${profile.organizationId}/coaches/${uid}`).get();
      if (!coach.exists || (coach.get('status') ?? 'active') !== 'active') return null;
      return { uid, orgId: profile.organizationId, isAdmin: profile.role === 'org_admin' };
    },

    async getOrg(orgId) {
      const snap = await orgRef(orgId).get();
      return snap.exists ? snap.data() ?? {} : null;
    },

    async saveLink(orgId, previousToken, link) {
      const batch = db.batch();
      if (previousToken && previousToken !== link.token) batch.delete(db.doc(`intake-links/${previousToken}`));
      batch.set(db.doc(`intake-links/${link.token}`), { organizationId: orgId, enabled: link.enabled, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
      batch.set(orgRef(orgId), { intakeLink: { ...link, rotatedAt: FieldValue.serverTimestamp() } }, { merge: true });
      await batch.commit();
    },

    async resolveLink(token) {
      const data = (await db.doc(`intake-links/${token}`).get()).data() as { organizationId?: string; enabled?: boolean } | undefined;
      return data?.organizationId ? { orgId: data.organizationId, enabled: data.enabled === true } : null;
    },

    async allow(key, maxRequests, windowSeconds) {
      try {
        await assertRateLimit(db, key, { maxRequests, windowSeconds });
        return true;
      } catch (error) {
        if ((error as { code?: string }).code === 'RATE_LIMITED') return false;
        throw error;
      }
    },

    async addIntake(orgId, intake) {
      const ref = await db.collection(`organizations/${orgId}/intakes`).add({ ...intake, submittedAt: FieldValue.serverTimestamp() });
      return ref.id;
    },

    async getIntake(orgId, id) {
      const snap = await intakeRef(orgId, id).get();
      return snap.exists ? (snap.data() as IntakeDoc) : null;
    },

    async findClientsByEmail(orgId, email) {
      const snap = await db.collection(`organizations/${orgId}/clients`).where('email', '==', email).limit(10).get();
      return snap.docs.map((doc) => ({
        clientSlug: doc.id,
        clientName: String(doc.get('clientName') ?? doc.id),
        coachUid: (doc.get('assignedCoachUid') ?? doc.get('coachUid')) as string | undefined,
        status: doc.get('status') as string | undefined,
      }));
    },

    async setIntakeStatus(orgId, id, status) {
      await intakeRef(orgId, id).update({ status, handledAt: FieldValue.serverTimestamp() });
    },

    async convert(orgId, intakeId, slug, convertedBy, build) {
      const clientRef = db.doc(`organizations/${orgId}/clients/${slug}`);
      const draftRef = db.doc(`organizations/${orgId}/clients/${slug}/assessmentDrafts/draft`);
      return db.runTransaction(async (tx) => {
        const [intakeSnap, clientSnap, draftSnap, orgSnap] = await Promise.all([
          tx.get(intakeRef(orgId, intakeId)), tx.get(clientRef), tx.get(draftRef), tx.get(orgRef(orgId)),
        ]);
        if (intakeSnap.get('status') !== 'new') return { kind: 'conflict' as const, reason: 'already_handled' as const };
        const out = build(
          clientSnap.exists ? clientSnap.data() ?? {} : null,
          draftSnap.exists ? (draftSnap.data() as DraftLike) : null,
          orgSnap.exists ? orgSnap.data() ?? {} : null,
        );
        if (out.kind === 'conflict') return out;
        const now = FieldValue.serverTimestamp();
        if (out.newClient) tx.create(clientRef, { ...out.newClient, createdAt: now });
        tx.set(clientRef, { hasAssessmentDraft: true, draftUpdatedAt: now }, { merge: true });
        const { formData, activePhaseId, activePhaseIdx, importPath, externalImport } = out.draft;
        // update() takes dotted field paths, so `externalImports.{provider}` lands as a nested key.
        const draftFields = {
          clientName: formData.fullName,
          organizationId: orgId,
          formData,
          updatedAt: now,
          [importPath]: externalImport,
          ...(activePhaseId ? { activePhaseId } : {}),
          ...(typeof activePhaseIdx === 'number' ? { activePhaseIdx } : {}),
        };
        if (draftSnap.exists) tx.update(draftRef, draftFields);
        else tx.set(draftRef, { ...draftFields, [importPath]: externalImport });
        tx.update(intakeRef(orgId, intakeId), { status: 'converted', clientSlug: slug, convertedBy, handledAt: now });
        return { kind: 'ok' as const, created: Boolean(out.newClient) };
      });
    },
  };
}
