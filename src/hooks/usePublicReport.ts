import { assessmentDate as resolveAssessmentDate } from '@/lib/assessment/assessmentDate';
/**
 * Real-time subscription to a public report by token.
 * Used by PublicReportViewer so client PWA updates when coach saves assessment.
 */

import { useState, useEffect } from 'react';
import type { FormData } from '@/contexts/FormContext';
import type { ScoreSummary } from '@/lib/scoring';
import type { SnapshotSummary } from '@/services/publicReports';
import { subscribeToPublicReport } from '@/services/publicReports';
import { computeScores } from '@/lib/scoring';
import { logger } from '@/lib/utils/logger';
import { validAssessmentComparison, type AssessmentComparison } from '@/lib/reports/assessmentComparison';

export interface UsePublicReportResult {
  comparison: AssessmentComparison | null;
  formData: FormData | null;
  scores: ScoreSummary | null;
  previousFormData: FormData | undefined;
  previousScores: ScoreSummary | null;
  snapshotSummaries: SnapshotSummary[];
  orgDetails: { name: string; logoUrl?: string } | null;
  error: string | null;
  loading: boolean;
  clientName: string;
  /** AI-generated "what changed" narrative — set after coach first shares the report */
  changeNarrative: string | null;
  assessmentDate: Date | null;
}

function parseDoc(
  data: import('@/services/publicReports').PublicReportDoc,
): {
  formData: FormData;
  scores: ScoreSummary;
  previousFormData: FormData | undefined;
  previousScores: ScoreSummary | null;
  snapshotSummaries: SnapshotSummary[];
} {
  const fd = data.formData;
  const s = computeScores(fd);
  // previousFormData on this doc is often a re-save of the same assessment.
  // Ignore that legacy field. Only the versioned numeric comparison payload
  // may provide measured changes; it is validated separately against this capture.
  return {
    formData: fd,
    scores: s,
    previousFormData: undefined,
    previousScores: null,
    snapshotSummaries: data.snapshotSummaries ?? [],
  };
}

export function usePublicReport(token: string | undefined): UsePublicReportResult {
  const [comparison, setComparison] = useState<AssessmentComparison | null>(null);
  const [formData, setFormData] = useState<FormData | null>(null);
  const [scores, setScores] = useState<ScoreSummary | null>(null);
  const [previousFormData, setPreviousFormData] = useState<FormData | undefined>(undefined);
  const [previousScores, setPreviousScores] = useState<ScoreSummary | null>(null);
  const [snapshotSummaries, setSnapshotSummaries] = useState<SnapshotSummary[]>([]);
  const [orgDetails, setOrgDetails] = useState<{ name: string; logoUrl?: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [changeNarrative, setChangeNarrative] = useState<string | null>(null);
  const [assessmentDate, setAssessmentDate] = useState<Date | null>(null);

  useEffect(() => {
    setComparison(null);
    if (!token) {
      setError('Invalid report link.');
      setLoading(false);
      setFormData(null);
      setScores(null);
      setPreviousFormData(undefined);
      setPreviousScores(null);
      setSnapshotSummaries([]);
      setOrgDetails(null);
      setAssessmentDate(null);
      return;
    }

    setLoading(true);
    setError(null);

    const unsubscribe = subscribeToPublicReport(
      token,
      (data) => {
        setComparison(null);
        if (!data) {
          setError('This report is no longer available or has expired.');
          setLoading(false);
          setFormData(null);
          setScores(null);
          setPreviousFormData(undefined);
          setPreviousScores(null);
          setSnapshotSummaries([]);
          setOrgDetails(null);
          setAssessmentDate(null);
          return;
        }
        if (data.revoked) {
          setError('This report is no longer available.');
          setLoading(false);
          setFormData(null);
          setScores(null);
          setPreviousFormData(undefined);
          setPreviousScores(null);
          setSnapshotSummaries([]);
          setOrgDetails(null);
          setAssessmentDate(null);
          return;
        }

        if (data.clientName) {
          document.title = `${data.clientName}'s Fitness Report | One Assess`;
        }

        const { formData: fd, scores: s, previousFormData: prevFd, previousScores: prevS, snapshotSummaries: summaries } = parseDoc(data);
        setComparison(validAssessmentComparison(fd, data.assessmentComparison));
        setFormData(fd);
        setScores(s);
        setPreviousFormData(prevFd);
        setPreviousScores(prevS);
        setSnapshotSummaries(summaries);
        setChangeNarrative(data.changeNarrative ?? null);
        const summaryDate = summaries[0]?.date?.toDate?.() ?? null;
        const created = data.createdAt?.toDate?.() ?? null;
        setAssessmentDate(resolveAssessmentDate(fd.assessedAt, summaryDate ?? created));
        setLoading(false);

        if (data.organizationId) {
          import('@/services/organizations')
            .then(({ getOrgSettings }) => getOrgSettings(data.organizationId!))
            .then((settings) => {
              if (settings.customBrandingEnabled === true) {
                setOrgDetails({ name: settings.name, logoUrl: settings.logoUrl });
              } else {
                setOrgDetails(null);
              }
              if (settings.name && data.clientName) {
                document.title = `${data.clientName}'s Fitness Report | ${settings.name}`;
              }
            })
            .catch((orgErr) => {
              logger.warn('[usePublicReport] Failed to fetch organization branding:', orgErr);
            });
        }
      },
    );

    return () => unsubscribe();
  }, [token]);

  const clientName = formData?.fullName ?? 'Client';

  return {
    formData,
    comparison,
    scores,
    previousFormData,
    previousScores,
    snapshotSummaries,
    orgDetails,
    error,
    loading,
    clientName,
    changeNarrative,
    assessmentDate,
  };
}
