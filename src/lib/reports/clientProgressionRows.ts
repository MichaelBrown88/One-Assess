import type { FormData } from '@/contexts/FormContext';
import type { ScoreCategory, ScoreSummary } from '@/lib/scoring';
import type { GapAnalysisData } from '@/components/reports/useGapAnalysisData';
import type { SectionId } from '@/components/reports/client/clientReportSections';
import {
  buildBodyCompProgressionRows,
  buildCardioProgressionRows,
  buildStrengthProgressionRows,
} from '@/lib/reports/clientProgressionProjections';
import { PLAN_WEEKS } from '@/lib/reports/plannedTraining';

/** Weeks in one calendar month — same 52/12 basis as PLAN_CALENDAR_MONTHS. */
export const CALENDAR_MONTH_WEEKS = 52 / 12;

export interface ClientReportProgressionRow {
  name: string;
  /** Actual measured difference from a verified earlier assessment, never a forecast. */
  measuredChange?: { delta: number; previous: number; unit: string };
  /** Unrounded baseline and cumulative estimate; formatting never drives the calculation. */
  baseline?: number;
  changeAtPlan?: number;
  changeAtOneMonth?: number;
  unit?: string;
  current: string;
  /** ~1 calendar month along the plan path (52/12 weeks). */
  oneMonth?: string;
  /** End of plan (`CLIENT_PLAN_WEEKS`). Legacy field name kept for call sites. */
  twelveWeeks: string;
  /** Plain "what we saw + why it matters" line under the row name. */
  detail?: string;
}

/** Linear share of the plan-length change over one calendar month. */
export function projectAtCalendarMonth(
  current: string,
  atPlan: string,
  planWeeks = PLAN_WEEKS,
): string {
  if (!atPlan.trim() || atPlan === '–' || atPlan === '-') return atPlan;
  const from = Number(current);
  const to = Number(atPlan);
  if (!current.trim() || !Number.isFinite(from) || !Number.isFinite(to) || planWeeks <= 0) {
    return '–';
  }
  const frac = CALENDAR_MONTH_WEEKS / planWeeks;
  const decimals = (atPlan.split('.')[1] ?? '').length;
  const next = from + (to - from) * frac;
  if (decimals === 0) return String(Math.round(next));
  const factor = 10 ** decimals;
  return (Math.round(next * factor) / factor).toFixed(decimals);
}

export function withOneMonthHorizon(rows: ClientReportProgressionRow[]): ClientReportProgressionRow[] {
  return rows.map(row => {
    const change = row.changeAtPlan == null ? undefined : row.changeAtPlan * CALENDAR_MONTH_WEEKS / PLAN_WEEKS;
    const decimals = (row.current.split('.')[1] ?? '').length;
    const oneMonth = change != null && row.baseline != null
      ? (row.baseline + change).toFixed(decimals) : projectAtCalendarMonth(row.current, row.twelveWeeks);
    return { ...row, oneMonth, changeAtOneMonth: change };
  });
}

export function buildClientProgressionRows(
  sectionId: SectionId,
  gapAnalysisData: GapAnalysisData[],
  formData: FormData | undefined,
  category: ScoreCategory | undefined,
  scores?: ScoreSummary,
  goals?: string[],
): ClientReportProgressionRow[] {
  const gapIndex =
    sectionId === 'body-comp' ? 0 : sectionId === 'strength' ? 1 : sectionId === 'cardio' ? 2 : -1;
  const gap = gapIndex >= 0 ? gapAnalysisData[gapIndex] : undefined;

  if (sectionId === 'body-comp') {
    const rows = buildBodyCompProgressionRows(formData, scores, goals, gap);
    if (rows.length > 0) return withOneMonthHorizon(rows);
  }

  if (sectionId === 'strength') {
    const rows = buildStrengthProgressionRows(formData, goals, gap, scores);
    if (rows.length > 0) return withOneMonthHorizon(rows);
  }

  if (sectionId === 'cardio') {
    const rows = buildCardioProgressionRows(formData, scores, goals, gap);
    if (rows.length > 0) return withOneMonthHorizon(rows);
  }

  return [];
}
