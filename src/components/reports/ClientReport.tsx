import { validAssessmentComparison, type AssessmentComparison } from '@/lib/reports/assessmentComparison';
/**
 * Client AXIS report — one v2 document. `standalone` only changes page chrome.
 */

import { assessmentDate as resolveAssessmentDate } from '@/lib/assessment/assessmentDate';
import React, { useMemo } from 'react';
import type { FormData } from '@/contexts/FormContext';
import type { ScoreSummary } from '@/lib/scoring';
import { useClientReportData } from './client/useClientReportData';
import { buildClientReportModel } from '@/lib/reports/buildClientReportModel';
import { ClientReportV2Layout } from './client/v2/ClientReportV2Layout';
import { reportPlanSessions, withReportLiftingSessions } from '@/lib/reports/plannedTraining';

export default function ClientReport({
  scores,
  goals,
  formData: rawFormData,
  bodyComp: _bodyComp,
  previousScores,
  previousFormData,
  comparison: suppliedComparison,
  standalone = true,
  assessmentDate,
  coachActions,
  reportMeta,
}: {
  scores: ScoreSummary;
  goals?: string[];
  formData?: FormData;
  bodyComp?: { timeframeWeeks: string };
  previousScores?: ScoreSummary | null;
  previousFormData?: FormData;
  comparison?: AssessmentComparison | null;
  standalone?: boolean;
  assessmentDate?: Date | null;
  coachActions?: {
    onShare?: () => void;
    onSendToClient?: () => void;
    onDownloadPdf?: () => void;
  };
  reportMeta?: {
    orgName?: string;
    coachName?: string;
    assessmentNumber?: number;
  };
}) {
  const comparison = validAssessmentComparison(rawFormData, suppliedComparison);
  const verifiedPreviousForm = comparison && previousFormData?.assessedAt
    && Date.parse(previousFormData.assessedAt) === Date.parse(comparison.previousAssessedAt) ? previousFormData : undefined;
  const verifiedPreviousScores = verifiedPreviousForm ? previousScores : null;
  const planSessions = reportPlanSessions(rawFormData);
  const formData = useMemo(
    () => (rawFormData ? { ...withReportLiftingSessions(rawFormData, planSessions), assessedAt: resolveAssessmentDate(rawFormData.assessedAt, assessmentDate)?.toISOString() } : undefined),
    [rawFormData, planSessions, assessmentDate],
  );

  const {
    safeScores,
    clientName,
    hasAnyData,
    gapAnalysisData,
    reportDate,
  } = useClientReportData({
    scores,
    goals,
    formData,
    previousScores: verifiedPreviousScores,
    previousFormData: verifiedPreviousForm,
    assessmentDate,
  });

  const reportModel = useMemo(
    () =>
      buildClientReportModel({
        scores: safeScores,
        formData,
        goals,
        previousScores: verifiedPreviousScores,
        comparison,
        gapAnalysisData,
        clientName,
        reportDate,
      }),
    [
      safeScores,
      formData,
      goals,
      verifiedPreviousScores,
      comparison,
      gapAnalysisData,
      clientName,
      reportDate,
    ],
  );

  if (!scores || !scores.categories || scores.categories.length === 0 || !hasAnyData) {
    return (
      <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        <p className="font-semibold mb-2">No assessment data available</p>
        <p>Please complete at least one section of the assessment to generate a report.</p>
      </div>
    );
  }

  const containerClass = standalone
    ? 'min-h-screen overflow-x-hidden bg-muted/40 px-0 py-6 text-foreground xl:px-8 xl:py-8'
    : 'w-full overflow-x-hidden text-foreground';

  const contentClass = standalone
    ? 'mx-auto w-full min-w-0 max-w-5xl'
    : 'w-full min-w-0';

  return (
    <div className={containerClass}>
      <div className={`${contentClass} overflow-x-hidden`}>
        <ClientReportV2Layout
          model={reportModel}
          orgName={reportMeta?.orgName}
          showPartialAssessmentBanner
          showActions={Boolean(coachActions)}
          onShare={coachActions?.onShare}
          onSendToClient={coachActions?.onSendToClient}
          onDownloadPdf={coachActions?.onDownloadPdf}
        />
      </div>
    </div>
  );
}
