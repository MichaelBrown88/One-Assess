import { useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useResumeAssessment } from '@/hooks/useResumeAssessment';

export const RESUME_QUERY_PARAM = 'resume';

/**
 * `?resume=1` on a client page (sent by the OFS hand-off) opens that client's draft through the
 * same path as the Resume button. Fires once, then drops the flag so a reload does not repeat it.
 */
export function useResumeFromUrl(clientKey: string, ready: boolean): void {
  const [searchParams, setSearchParams] = useSearchParams();
  const { resumeAssessment } = useResumeAssessment();
  const fired = useRef(false);
  const wantsResume = searchParams.get(RESUME_QUERY_PARAM) === '1';

  useEffect(() => {
    if (!wantsResume || !ready || !clientKey || fired.current) return;
    fired.current = true;
    setSearchParams((previous) => {
      const next = new URLSearchParams(previous);
      next.delete(RESUME_QUERY_PARAM);
      return next;
    }, { replace: true });
    void resumeAssessment(clientKey);
  }, [wantsResume, ready, clientKey, resumeAssessment, setSearchParams]);
}
