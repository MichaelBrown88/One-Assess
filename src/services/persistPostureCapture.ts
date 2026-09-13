import { collection, getDocs, limit, query, serverTimestamp, setDoc, where } from 'firebase/firestore';
import type { FormData } from '@/contexts/FormContext';
import type { PostureCompanionData } from '@/lib/types/companion';
import { getDb } from '@/services/firebase';
import { getCurrentAssessment } from '@/services/assessmentHistory';
import { getClientCurrentStateDoc } from '@/lib/database/collections';
import { generateClientSlug } from '@/services/clientProfiles';
import { prepareFormDataForPersistence, pickPersistableImageMap } from '@/lib/assessment/prepareFormDataForPersistence';
import { sanitizeForFirestore } from '@/lib/utils/firebaseUtils';
import { publishPublicReport } from '@/services/publicReports';
import { COLLECTIONS } from '@/constants/collections';
import { logger } from '@/lib/utils/logger';

/**
 * Capture used to only patch in-memory formData. If the coach had already
 * saved, the AXIS document never received Storage URLs or analysis.
 * Write onto current/state and republish the public report.
 */
export async function persistCommittedPosture(params: {
  organizationId: string;
  clientName: string;
  coachUid: string;
  posture: PostureCompanionData;
}): Promise<void> {
  const { organizationId, clientName, coachUid, posture } = params;
  const name = clientName.trim();
  if (!name) return;

  const current = await getCurrentAssessment(coachUid, name, organizationId);
  if (!current?.formData) return;

  const merged: FormData = prepareFormDataForPersistence({
    ...current.formData,
    ...posture,
    postureImages: {},
    postureImagesStorage: {
      ...pickPersistableImageMap(current.formData.postureImagesStorage),
      ...pickPersistableImageMap(posture.postureImagesStorage),
    },
    postureAiResults: {
      ...(current.formData.postureAiResults ?? {}),
      ...(posture.postureAiResults ?? {}),
    },
  });

  const stateRef = getClientCurrentStateDoc(organizationId, generateClientSlug(name));
  await setDoc(
    stateRef,
    {
      formData: sanitizeForFirestore(merged),
      lastUpdated: serverTimestamp(),
    },
    { merge: true },
  );

  try {
    const existing = await getDocs(
      query(
        collection(getDb(), COLLECTIONS.PUBLIC_REPORTS),
        where('coachUid', '==', coachUid),
        where('organizationId', '==', organizationId),
        where('clientNameLower', '==', name.toLowerCase()),
        where('visibility', '==', 'public'),
        limit(1),
      ),
    );
    const assessmentId = existing.docs[0]?.data()?.assessmentId as string | undefined;
    if (!assessmentId) return;
    await publishPublicReport({
      coachUid,
      assessmentId,
      formData: merged,
      organizationId,
    });
  } catch (err) {
    logger.warn('[persistCommittedPosture] Public report republish skipped', err);
  }
}
