import { useEffect, useState } from 'react';
import type { FormData } from '@/types/assessmentForm';
import { useAuth } from './useAuth';
import { getCurrentAssessment, getSnapshots } from '@/services/assessmentHistory';
import { buildAssessmentComparison, type AssessmentComparison } from '@/lib/reports/assessmentComparison';
import { logger } from '@/lib/utils/logger';

/** Read the completed save for the debrief; never infer a capture date from render time. */
export function useSavedReportComparison(savingId: string | null, clientName: string, saving: boolean) {
  const { user, profile } = useAuth();
  const orgId = profile?.organizationId;
  const uid = user?.uid;
  const key = uid && orgId && savingId && !saving ? `${uid}:${orgId}:${savingId}:${clientName}` : null;
  const [loaded, setLoaded] = useState<{ key: string; formData: FormData; comparison: AssessmentComparison | null } | null>(null);
  useEffect(() => {
    if (!key || !uid || !orgId || !clientName) { setLoaded(null); return; }
    let cancelled = false;
    void Promise.all([
      getCurrentAssessment(uid, clientName, orgId),
      getSnapshots(uid, clientName, 100, orgId),
    ]).then(([current, sessions]) => {
      if (!cancelled && current?.formData) setLoaded({ key, formData: current.formData, comparison: buildAssessmentComparison(current.formData, sessions) });
    }).catch(error => logger.warn('Saved report comparison unavailable', 'REPORT', { error }));
    return () => { cancelled = true; };
  }, [key, uid, orgId, clientName]);
  return loaded?.key === key ? loaded : null;
}
