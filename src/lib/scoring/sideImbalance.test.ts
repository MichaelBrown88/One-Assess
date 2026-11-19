import { describe, expect, it } from 'vitest';
import { initialFormData, type FormData } from '@/types/assessmentForm';
import { assessSideImbalance, SIDE_IMBALANCE_PCT } from './sideImbalance';
import { scoreStrength } from './strengthScoring';

describe('assessSideImbalance', () => {
  it('treats a recorded 0 on one side as a full gap', () => {
    expect(assessSideImbalance('0', '6')).toMatchObject({ weakSide: 'left', gapPct: 100, material: true });
    expect(assessSideImbalance('0', '0')).toBeNull();
  });

  it('flags a gap of 10% or more and names the weaker side', () => {
    const r = assessSideImbalance('36', '44');
    expect(r).toEqual({ weakSide: 'left', strongSide: 'right', weak: 36, strong: 44, gap: 8, gapPct: 18, material: true });
  });

  it('treats a small dominant-hand difference as normal', () => {
    const r = assessSideImbalance('42', '45');
    expect(r?.material).toBe(false);
    expect(r?.gapPct).toBeLessThan(SIDE_IMBALANCE_PCT);
  });

  it('flags at exactly the threshold', () => {
    expect(assessSideImbalance('45', '50')?.material).toBe(true);
  });

  it('needs both hands', () => {
    expect(assessSideImbalance('44', '')).toBeNull();
    expect(assessSideImbalance(undefined, '44')).toBeNull();
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
