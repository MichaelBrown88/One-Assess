import { describe, expect, it } from 'vitest';
import { COMPARISON_CURRENT_FORM as current, COMPARISON_PREVIOUS_FORM as previous } from '@/constants/reportComparisonPreview';
import { buildAssessmentComparison, selectPreviousAssessment, validAssessmentComparison, withMeasuredChanges, formatMeasuredChange, type ComparisonSession } from './assessmentComparison';
import { buildBodyCompProgressionRows, buildStrengthProgressionRows, buildCardioProgressionRows, buildTapeMeasurementRows } from './clientProgressionProjections';
import { computeScores } from '@/lib/scoring';

const session = (id: string, formData = previous, type = 'full-assessment', savedAt = 0): ComparisonSession => ({
  id, type, formData, timestamp: { toMillis: () => savedAt },
});
const sessions = [session('current', current), session('previous')];
const payload = () => buildAssessmentComparison(current, sessions)!;

describe('real previous assessment selection', () => {
  it('requires a distinct earlier saved full capture, not a second save row', () => {
    expect(selectPreviousAssessment(current, [session('current', current), session('resave', current)])).toBeNull();
    expect(selectPreviousAssessment(current, sessions)?.id).toBe('previous');
    expect(selectPreviousAssessment(current, [session('draft', current, 'manual'), session('previous')])).toBeNull();
  });
  it('chooses the latest version of the closest earlier capture and preserves date corrections', () => {
    const older = { ...previous, assessedAt: '2025-01-01T12:00:00Z' };
    const edit = { ...previous, waistCm: '94' };
    const list = [session('old', older, 'full-assessment', 900), session('prior-original'), session('current', current), session('prior-edited', edit, 'full-assessment', 100)];
    expect(selectPreviousAssessment(current, list)?.id).toBe('prior-edited');
    expect(buildAssessmentComparison(current, list)?.readings.waist.value).toBe(94);
    expect(selectPreviousAssessment(previous, list)?.id).toBe('old');
  });
  it('rejects undated legacy rows, future captures, another client, partial and incomplete assessments', () => {
    for (const candidate of [
      session('undated', { ...previous, assessedAt: undefined }),
      session('future', { ...previous, assessedAt: '2027-01-01T12:00:00Z' }),
      session('other-client', { ...previous, fullName: 'Another client' }),
      session('partial', previous, 'partial-bodycomp'),
      session('incomplete', { ...previous, cardioRestingHr: '', cardioPeakHr: '', cardioPost1MinHr: '' }),
    ]) expect(selectPreviousAssessment(current, [session('current', current), candidate])).toBeNull();
    expect(buildAssessmentComparison({ ...current, assessedAt: undefined }, sessions)).toBeNull();
  });
  it('does not use an edited save of the selected assessment as prior history', () => {
    const list = [session('future', current), session('selected', previous), session('edited-selected', previous, 'full-assessment', 200)];
    expect(buildAssessmentComparison(previous, list)).toBeNull();
  });
});

describe('measured changes and public payload', () => {
  it('publishes only whitelisted numeric readings and provenance', () => {
    const p = payload();
    expect(Object.keys(p).sort()).toEqual(['version','currentAssessedAt','previousAssessedAt','previousSessionId','readings'].sort());
    expect(JSON.stringify(p)).not.toMatch(/fullName|email|phone|posture|notes/);
    expect(validAssessmentComparison(current, JSON.parse(JSON.stringify(p)))).toEqual(p);
    expect(validAssessmentComparison(current, { ...p, currentAssessedAt: previous.assessedAt! })).toBeNull();
    expect(validAssessmentComparison(current, { ...p, previousAssessedAt: current.assessedAt! })).toBeNull();
    expect(validAssessmentComparison(current, { ...p, version: 2 } as never)).toBeNull();
    expect(validAssessmentComparison(current, undefined)).toBeNull();
  });
  it('computes actual body changes independently of future projections', () => {
    const scores = computeScores(current);
    const rows = withMeasuredChanges(buildBodyCompProgressionRows(current, scores, current.clientGoals), current, payload(), scores);
    expect(formatMeasuredChange(rows[0].measuredChange!)).toBe('−3.0 kg');
    expect(formatMeasuredChange(rows[1].measuredChange!)).toBe('−2.0 percentage points');
    expect(formatMeasuredChange(rows[2].measuredChange!)).toBe('+0.5 kg');
  });
  it('does not turn missing measurements into zero, but retains a captured zero', () => {
    const p = payload();
    delete p.readings.muscleMass;
    const rows = withMeasuredChanges(buildBodyCompProgressionRows(current, computeScores(current), current.clientGoals), current, p);
    expect(rows.find(r => r.name === 'Muscle mass')?.measuredChange).toBeUndefined();
    const zero = { ...current, pushupsOneMinuteReps: '0' };
    const strength = withMeasuredChanges(buildStrengthProgressionRows(zero, zero.clientGoals), zero, payload());
    expect(strength.find(r => r.name.startsWith('Upper-body'))?.measuredChange?.delta).toBe(-24);
  });
  it('requires comparable strength test methods and grip hand coverage', () => {
    const p = payload();
    p.readings.upperBody.protocol = 'pushups-max';
    const changed = { ...current, gripLeftKg: '' };
    const rows = withMeasuredChanges(buildStrengthProgressionRows(changed, changed.clientGoals), changed, p);
    expect(rows.find(r => r.name.startsWith('Upper-body'))?.measuredChange).toBeUndefined();
    expect(rows.find(r => r.name === 'Grip strength')?.measuredChange).toBeUndefined();
    expect(rows.find(r => r.name === 'Core strength')?.measuredChange?.delta).toBe(27);
  });
  it('requires a matching recorded effort protocol for recovery, peak and fitness score', () => {
    const scores = computeScores(current);
    const rows = buildCardioProgressionRows(current, scores, current.clientGoals);
    expect(withMeasuredChanges(rows, current, payload(), scores).find(r => r.name === 'Heart recovery')?.measuredChange?.delta).toBe(8);
    for (const treadmillProtocol of ['', 'different-test']) {
      const changed = { ...current, treadmillProtocol };
      const result = withMeasuredChanges(rows, changed, payload(), scores);
      expect(result.find(r => r.name === 'Heart recovery')?.measuredChange).toBeUndefined();
      expect(result.find(r => r.name === 'Fitness level')?.measuredChange).toBeUndefined();
      expect(result.find(r => r.name === 'Resting heart rate')?.measuredChange?.delta).toBe(-6);
    }
  });
  it('shows neutral tape deltas, including unchanged measurements', () => {
    const rows = withMeasuredChanges(buildTapeMeasurementRows(current), current, payload());
    expect(formatMeasuredChange(rows.find(r => r.name === 'Waist')!.measuredChange!)).toBe('−3.0 cm');
    expect(formatMeasuredChange(rows.find(r => r.name === 'Left arm')!.measuredChange!)).toBe('+0.5 cm');
    expect(formatMeasuredChange(rows.find(r => r.name === 'Left calf')!.measuredChange!)).toBe('No change');
  });
});
