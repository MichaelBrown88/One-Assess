import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { getDraftAssessment } from '@/services/coachAssessments';
import { prepareAssessmentResume } from '@/lib/assessment/resumeAssessment';
import { ASSESSMENT_DRAFT_COPY } from '@/constants/assessmentDraft';
import { ROUTES } from '@/constants/routes';
import { logger } from '@/lib/utils/logger';

let latestResumeRequest = 0;

export function useResumeAssessment() {
  const { effectiveOrgId, profile } = useAuth();
  const orgId = effectiveOrgId || profile?.organizationId;
  const currentOrg = useRef(orgId);
  currentOrg.current = orgId;
  const navigate = useNavigate();
  const { toast } = useToast();
  const [resuming, setResuming] = useState(false);
  const inFlight = useRef(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);
  const resumeAssessment = useCallback(async (clientKey: string) => {
    if (inFlight.current || !orgId) return;
    const request = ++latestResumeRequest;
    inFlight.current = true;
    setResuming(true);
    try {
      const draft = await getDraftAssessment(clientKey, orgId, true);
      if (!mounted.current || currentOrg.current !== orgId || request !== latestResumeRequest) return;
      if (!draft) throw new Error(ASSESSMENT_DRAFT_COPY.MISSING);
      prepareAssessmentResume(draft);
      navigate(ROUTES.ASSESSMENT);
    } catch (error) {
      logger.warn('[Assessment] Resume failed', error);
      if (mounted.current) toast({ title: ASSESSMENT_DRAFT_COPY.LOAD_ERROR, variant: 'destructive' });
    } finally {
      inFlight.current = false;
      if (mounted.current) setResuming(false);
    }
  }, [orgId, navigate, toast]);
  return { resumeAssessment, resuming };
}
