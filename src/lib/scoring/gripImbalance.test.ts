import { describe, expect, it } from 'vitest';
import { initialFormData, type FormData } from '@/types/assessmentForm';
import { assessGripImbalance, GRIP_IMBALANCE_PCT } from './gripImbalance';
import { scoreStrength } from './strengthScoring';

describe('assessGripImbalance', () => {
  it('flags a gap of 10% or more and names the weaker side', () => {
    const r = assessGripImbalance('36', '44');
    expect(r).toEqual({ weakSide: 'left', strongSide: 'right', weakKg: 36, strongKg: 44, gapKg: 8, gapPct: 18, material: true });
  });

  it('treats a small dominant-hand difference as normal', () => {
    const r = assessGripImbalance('42', '45');
    expect(r?.material).toBe(false);
    expect(r?.gapPct).toBeLessThan(GRIP_IMBALANCE_PCT);
  });

  it('flags at exactly the threshold', () => {
    expect(assessGripImbalance('45', '50')?.material).toBe(true);
  });

  it('needs both hands', () => {
    expect(assessGripImbalance('44', '')).toBeNull();
    expect(assessGripImbalance(undefined, '44')).toBeNull();
  });
});

describe('strength pillar names a material grip imbalance', () => {
  const form = (o: Partial<FormData>): FormData => ({ ...initialFormData, ...o });

  it('adds a focus line for the weaker side', () => {
    const r = scoreStrength(form({ gripLeftKg: '44', gripRightKg: '36' }), 35, 'male');
    expect(r.weaknesses.join(' ')).toMatch(/right.*weaker/i);
  });

  it('says nothing about balance when the hands are close', () => {
    const r = scoreStrength(form({ gripLeftKg: '44', gripRightKg: '42' }), 35, 'male');
    expect(r.weaknesses.join(' ')).not.toMatch(/weaker|imbalance/i);
  });
});
