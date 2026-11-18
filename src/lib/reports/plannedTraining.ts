/**
 * Training frequency and plan length used for AXIS projections and fuel.
 * Today's sedentary snapshot is not the plan — the report prescribes
 * one lifting week, with conditioning within those visits when relevant.
 */

import { CLIENT_PLAN_WEEKS } from '@/constants/clientReport';
import type { FormData } from '@/contexts/FormContext';
import type { ClientGoalContext } from '@/lib/goals/goalContext';
import type { ClientProfile } from '@/lib/physiology/rates';
import { buildClientProfile } from '@/lib/physiology/profile';
import type { ScoreSummary } from '@/lib/scoring';

export const PLAN_WEEKS = CLIENT_PLAN_WEEKS;
/** 4-week training months — the unit the physiology rates use. */
export const PLAN_MONTHS = PLAN_WEEKS / 4;
/** Calendar months in the plan — the unit the client reads a monthly pace in. */
export const PLAN_CALENDAR_MONTHS = (PLAN_WEEKS * 12) / 52;
/** Scales gains originally calibrated on a 12-week block to the plan length. */
export const PLAN_VS_TWELVE_WEEKS = PLAN_WEEKS / 12;

/** Prescribed lifting week when the client has not already committed to 5+. */
export const PRESCRIBED_LIFTING_SESSIONS = 3;
/** Zone-2 sessions the roadmap adds when fitness or fat loss is in play. */
export const PRESCRIBED_CARDIO_SESSIONS = 2;

/** Supported legacy training-frequency values; no comparison is rendered. */
export const REPORT_LIFTING_SESSION_OPTIONS = [3, 4, 5] as const;
export type ReportLiftingSessions = (typeof REPORT_LIFTING_SESSION_OPTIONS)[number];

/** Default proposed report week. */
export const RECOMMENDED_LIFTING_SESSIONS: ReportLiftingSessions = 4;

export function parseReportLiftingSessions(
  formData: FormData | undefined,
): ReportLiftingSessions | null {
  const raw = formData?.reportLiftingSessions;
  const n = typeof raw === 'number' ? raw : parseInt((raw ?? '').trim(), 10);
  if (n === 3 || n === 4 || n === 5) return n;
  return null;
}

/** The week the report plans around: the recommended 4, or 5 when the client already trains 5+. */
export function reportPlanSessions(formData: FormData | undefined): ReportLiftingSessions {
  return statedTrainingSessions(formData) >= 5 ? 5 : RECOMMENDED_LIFTING_SESSIONS;
}

export function withReportLiftingSessions(
  formData: FormData,
  sessions: ReportLiftingSessions,
): FormData {
  return { ...formData, reportLiftingSessions: String(sessions) };
}

export function statedTrainingSessions(formData: FormData | undefined): number {
  const raw = (formData?.trainingFrequency ?? '').trim();
  if (raw === '5+' || raw === '6' || raw === '7') return 5;
  const n = parseInt(raw, 10);
  if (Number.isFinite(n) && n >= 0 && n <= 7) return n;
  return 0;
}

/** Lifting sessions for the plan. Coach lock wins; empty / 0 floors at 3. */
export function plannedLiftingSessions(formData: FormData | undefined): number {
  const locked = parseReportLiftingSessions(formData);
  if (locked) return locked;
  const stated = statedTrainingSessions(formData);
  if (stated >= 5) return stated;
  if (stated >= 1) return stated;
  return PRESCRIBED_LIFTING_SESSIONS;
}

export function prescribedCardioSessions(ctx: ClientGoalContext): number {
  if (ctx.hasImproveFitness || ctx.hasWeightLoss) return PRESCRIBED_CARDIO_SESSIONS;
  return 0;
}

/** Conditioning is included within the proposed visits, not counted as extra visits. */
export function plannedFatLossSessions(
  formData: FormData | undefined,
  _ctx: ClientGoalContext,
): number {
  return plannedLiftingSessions(formData);
}

/** Profile whose frequency matches the prescribed lifting week, not today's steps. */
export function profileForTwelveWeekPlan(
  formData: FormData | undefined,
  scores?: ScoreSummary,
): ClientProfile {
  // FormData fields are optional; an empty object is a sedentary snapshot with no stated week.
  const snapshot = formData ?? ({} as FormData);
  const profile = buildClientProfile(snapshot, scores);
  return {
    ...profile,
    trainingFrequency: plannedLiftingSessions(formData),
  };
}

/** Same visit count as the lifting plan; conditioning takes place within those visits. */
export function profileForTwelveWeekFatLoss(
  formData: FormData | undefined,
  scores: ScoreSummary | undefined,
  ctx: ClientGoalContext,
): ClientProfile {
  const profile = profileForTwelveWeekPlan(formData, scores);
  return {
    ...profile,
    trainingFrequency: plannedFatLossSessions(formData, ctx),
  };
}

/** One proposed week, shared by report assumptions, actions and nutrition. */
export interface ReportTrainingWeek {
  visits: number;
  liftingSessions: number;
  conditioningSessions: number;
  conditioningPlacement: 'within-visits';
  proposed: true;
}

export function reportTrainingWeek(formData: FormData | undefined, ctx: ClientGoalContext): ReportTrainingWeek {
  const visits = reportPlanSessions(formData);
  return { visits, liftingSessions: visits, conditioningSessions: prescribedCardioSessions(ctx),
    conditioningPlacement: 'within-visits', proposed: true };
}
