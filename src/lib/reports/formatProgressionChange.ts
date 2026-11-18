import type { ClientReportProgressionRow } from './clientProgressionRows';
import { CALENDAR_MONTH_WEEKS } from './clientProgressionRows';
import { PLAN_WEEKS } from './plannedTraining';
import { CLIENT_PLAN_COPY as COPY } from '@/constants/clientPlanCopy';

export interface ProgressionChange { value: string; unit?: string; detail?: string }
/** Cumulative changes from the unrounded baseline, never an unsolicited destination. */
export function formatProgressionChange(row: ClientReportProgressionRow, horizon: 'month' | 'plan'): ProgressionChange {
  if (row.twelveWeeks === '–' || row.twelveWeeks === '-') return { value: '–' };
  const baseline = row.baseline ?? Number(row.current);
  const fullChange = row.changeAtPlan ?? Number(row.twelveWeeks) - baseline;
  if (!Number.isFinite(fullChange) || !Number.isFinite(baseline)) return { value: COPY.recheck };
  if (baseline === 0) return { value: COPY.recheck };
  if (Math.abs(fullChange) < 0.00001) return { value: COPY.maintain };
  const delta = fullChange * (horizon === 'month' ? CALENDAR_MONTH_WEEKS / PLAN_WEEKS : 1);
  const digits = row.unit === 'reps' || row.unit === 'sec' || row.unit === 'bpm' || !row.unit ? 0 : 1;
  const rounded = Number(Math.abs(delta).toFixed(digits));
  if (rounded === 0) return { value: COPY.smallChange };
  const amount = `${delta < 0 ? '−' : '+'}${rounded.toFixed(digits)}`;
  const unit = row.unit === '%' ? COPY.points : row.unit || 'points';
  const isPerformance = row.unit === 'reps' || row.unit === 'sec' || row.name === 'Grip strength';
  if (isPerformance && baseline > 0) {
    return { value: `${delta < 0 ? '−' : '+'}${Math.round(Math.abs(delta) / baseline * 100)}%`, detail: `${amount} ${unit}` };
  }
  return { value: amount, unit };
}
