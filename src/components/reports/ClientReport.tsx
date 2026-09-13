/**
 * Client AXIS report — one v2 document. `standalone` only changes page chrome.
 */

import React, { useMemo } from 'react';
import type { FormData } from '@/contexts/FormContext';
import type { ScoreSummary } from '@/lib/scoring';
import { useClientReportData } from './client/useClientReportData';
import { buildClientReportModel } from '@/lib/reports/buildClientReportModel';
import { ClientReportV2Layout } from './client/v2/ClientReportV2Layout';

export default function ClientReport({
  scores,
  goals,
  formData,
  bodyComp: _bodyComp,
  previousScores,
  previousFormData,
  standalone = true,
  coachActions,
  reportMeta,
}: {
  scores: ScoreSummary;
  goals?: string[];
  formData?: FormData;
  bodyComp?: { timeframeWeeks: string };
  previousScores?: ScoreSummary | null;
  previousFormData?: FormData;
  standalone?: boolean;
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
  const {
    safeScores,
    clientName,
    hasAnyData,
    gapAnalysisData,
    reportDate,
  } = useClientReportData({ scores, goals, formData, previousScores, previousFormData });

  const reportModel = useMemo(
    () =>
      buildClientReportModel({
        scores: safeScores,
        formData,
        goals,
        previousScores,
        gapAnalysisData,
        clientName,
        reportDate,
      }),
    [
      safeScores,
      formData,
      goals,
      previousScores,
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
    ? 'min-h-screen bg-muted/40 text-foreground px-3 py-6 sm:px-5 sm:py-8 md:px-6 lg:px-8 overflow-x-hidden'
    : 'w-full text-foreground overflow-x-hidden';

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
