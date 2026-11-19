import type { FormData } from '@/types/assessmentForm';
import { readLowerBody } from '@/lib/scoring/lowerBody';
import { computeScores, type ScoreSummary } from '@/lib/scoring';
import { CLIENT_METRIC_LABELS } from '@/constants/clientReport';
import type { ClientReportProgressionRow } from './clientProgressionRows';

export interface ComparisonSession {
  id?: string;
  type: string;
  assessmentType?: string;
  formData: FormData;
  timestamp?: { toMillis(): number };
}
interface Reading { value: number; unit: string; protocol: string }
export interface AssessmentComparison {
  version: 1;
  currentAssessedAt: string;
  previousAssessedAt: string;
  previousSessionId: string;
  readings: Record<string, Reading>;
}

function captureTime(form?: FormData): number {
  // Never substitute save time, report creation time or today's date.
  return form?.assessedAt ? Date.parse(form.assessedAt) : NaN;
}
function clientKey(form: FormData): string { return form.fullName?.trim().toLowerCase().replace(/\s+/g, ' ') ?? ''; }
function fullSession(s: ComparisonSession): boolean {
  return s.assessmentType !== 'pillar' && ['full', 'full-assessment'].includes(s.type);
}
/** Capture dates identify assessments; append-only save rows do not. */
export function selectPreviousAssessment(current: FormData | undefined, sessions: ComparisonSession[]): ComparisonSession | null {
  const now = captureTime(current);
  if (!current || !Number.isFinite(now) || !clientKey(current)) return null;
  if (!sessions.some(s => s.id && fullSession(s) && clientKey(s.formData) === clientKey(current)
    && captureTime(s.formData) === now && computeScores(s.formData).fullProfileScore != null)) return null;
  return sessions.filter(s => s.id && fullSession(s) && clientKey(s.formData) === clientKey(current)
    && Number.isFinite(captureTime(s.formData)) && captureTime(s.formData) < now
    && computeScores(s.formData).fullProfileScore != null)
    .sort((a, b) => captureTime(b.formData) - captureTime(a.formData)
      || (b.timestamp?.toMillis() ?? 0) - (a.timestamp?.toMillis() ?? 0))[0] ?? null;
}

/** Numeric whitelist. No names, contact details, photos or free-text notes. */
export function comparisonReadings(form: FormData, scores = computeScores(form)): Record<string, Reading> {
  const out: Record<string, Reading> = {};
  const add = (id: string, raw: unknown, unit: string, protocol: string, allowZero = false) => {
    if (typeof raw !== 'string' && typeof raw !== 'number') return;
    if (String(raw).trim() === '') return;
    const value = Number(raw);
    if (Number.isFinite(value) && (value > 0 || (allowZero && value === 0))) out[id] = { value, unit, protocol };
  };
  add('bodyWeight', form.inbodyWeightKg, 'kg', 'scale');
  const bodyMethod = form.bodyCompMethod || 'analyzer';
  add('bodyFat', form.inbodyBodyFatPct, 'percentage points', bodyMethod);
  add('muscleMass', form.skeletalMuscleMassKg, 'kg', bodyMethod);
  // A max-rep test is not interchangeable with the timed test.
  if (form.pushupsOneMinuteReps?.trim()) add('upperBody', form.pushupsOneMinuteReps, 'reps', 'pushups-60sec', true);
  else add('upperBody', form.pushupMaxReps, 'reps', 'pushups-max', true);
  // Single-leg sit-to-stand and legacy squats are different protocols, so they never compare.
  const lowerBody = readLowerBody(form);
  if (lowerBody) add('lowerBody', String(lowerBody.reps), lowerBody.protocol === 'single-leg-sts-30sec' ? 'reps per leg' : 'reps', lowerBody.protocol, true);
  add('core', form.plankDurationSeconds, 'sec', 'plank-hold', true);
  // Compare the same hand coverage, not a left-only result with a best-of-two result.
  if (form.gripTestMethod === 'dynamometer') {
    const left = Number(form.gripLeftKg), right = Number(form.gripRightKg);
    const hasLeft = !!form.gripLeftKg?.trim() && Number.isFinite(left) && left > 0;
    const hasRight = !!form.gripRightKg?.trim() && Number.isFinite(right) && right > 0;
    if (hasLeft || hasRight) add('grip', Math.max(hasLeft ? left : 0, hasRight ? right : 0), 'kg', `dynamometer-${hasLeft ? 'L' : ''}${hasRight ? 'R' : ''}`);
  }
  add('rhr', form.cardioRestingHr, 'bpm', 'resting-heart-rate');
  // Historical effort/recovery tests need a recorded matching protocol.
  if (form.treadmillProtocol?.trim()) {
    const protocol = form.treadmillProtocol.trim();
    add('peakHr', form.cardioPeakHr, 'bpm', protocol);
    const peak = Number(form.cardioPeakHr), recovery = Number(form.cardioPost1MinHr);
    if (form.cardioPeakHr?.trim() && form.cardioPost1MinHr?.trim() && peak > 0 && recovery > 0) {
      add('hrr', peak - recovery, 'bpm', protocol, true);
      const cardio = scores.categories.find(c => c.id === 'cardio' && c.assessed);
      if (cardio && form.cardioRestingHr?.trim()) add('vo2', cardio.score, 'points', `${protocol}:fitness-score-v1`, true);
    }
  }
  const tape = {
    shoulders: form.shouldersCm, chest: form.chestCm, armLeft: form.armLeftCm, armRight: form.armRightCm,
    waist: form.waistCm, hips: form.hipsCm || form.hipCm, thighLeft: form.thighLeftCm,
    thighRight: form.thighRightCm, calfLeft: form.calfLeftCm, calfRight: form.calfRightCm,
  };
  Object.entries(tape).forEach(([id, value]) => add(id, value, 'cm', 'tape'));
  return out;
}

export function buildAssessmentComparison(current: FormData | undefined, sessions: ComparisonSession[]): AssessmentComparison | null {
  const previous = selectPreviousAssessment(current, sessions);
  if (!current || !previous?.id) return null;
  return {
    version: 1, currentAssessedAt: new Date(captureTime(current)).toISOString(),
    previousAssessedAt: new Date(captureTime(previous.formData)).toISOString(),
    previousSessionId: previous.id, readings: comparisonReadings(previous.formData),
  };
}

/** Revalidate published data against the report actually being rendered. Fail closed. */
export function validAssessmentComparison(current: FormData | undefined, value: AssessmentComparison | null | undefined): AssessmentComparison | null {
  if (!current || !value || value.version !== 1 || !value.previousSessionId || !value.readings) return null;
  const now = captureTime(current), previous = Date.parse(value.previousAssessedAt);
  if (!Number.isFinite(now) || !Number.isFinite(previous) || Date.parse(value.currentAssessedAt) !== now || previous >= now) return null;
  return value;
}

export function withMeasuredChanges(rows: ClientReportProgressionRow[], form: FormData | undefined, payload: AssessmentComparison | null | undefined, scores?: ScoreSummary): ClientReportProgressionRow[] {
  const comparison = validAssessmentComparison(form, payload);
  if (!comparison || !form) return rows;
  const current = comparisonReadings(form, scores);
  return rows.map(row => {
    const id = Object.keys(current).find(key => CLIENT_METRIC_LABELS[key]?.short === row.name);
    const now = id ? current[id] : undefined;
    const previous = id ? comparison.readings[id] : undefined;
    if (!now || !previous || !Number.isFinite(previous.value) || previous.value < 0 || now.unit !== previous.unit || now.protocol !== previous.protocol) return row;
    return { ...row, measuredChange: { delta: now.value - previous.value, previous: previous.value, unit: now.unit } };
  });
}

export function formatMeasuredChange(change: NonNullable<ClientReportProgressionRow['measuredChange']>): string {
  const decimals = ['reps', 'sec', 'bpm', 'points'].includes(change.unit) ? 0 : 1;
  const rounded = Number(change.delta.toFixed(decimals));
  if (rounded === 0) return 'No change';
  return `${rounded > 0 ? '+' : '−'}${Math.abs(rounded).toFixed(decimals)} ${change.unit}`;
}
export function comparisonDate(value: string): string {
  return new Date(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
}
