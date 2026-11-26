import { safeParse } from '@/lib/utils/numbers';

/**
 * Left/right gap (relative to the stronger side) that counts as a real
 * imbalance. 10% is the handgrip-asymmetry cut-off used in research (e.g.
 * McGrath et al. 2020), sits just above the usual dominant-hand advantage, and
 * matches the common limb-symmetry benchmark (weaker side at least 90% of the
 * stronger). Used for grip and the single-leg sit-to-stand.
 */
export const SIDE_IMBALANCE_PCT = 10;

export type BodySide = 'left' | 'right';

export interface SideImbalance {
  weakSide: BodySide;
  strongSide: BodySide;
  weak: number;
  strong: number;
  gap: number;
  /** Whole-number percent gap relative to the stronger hand. */
  gapPct: number;
  material: boolean;
}

const isEntered = (v: string | number | null | undefined) =>
  v !== null && v !== undefined && String(v).trim() !== '';

/**
 * Compares a left and right result (grip kg, single-leg reps). Null unless both
 * sides were recorded. A side recorded as 0 against a positive other side is a
 * 100% gap; 0 on both sides is no comparison.
 */
export function assessSideImbalance(
  leftValue: string | number | null | undefined,
  rightValue: string | number | null | undefined,
): SideImbalance | null {
  if (!isEntered(leftValue) || !isEntered(rightValue)) return null;
  const left = safeParse(leftValue);
  const right = safeParse(rightValue);
  const strong = Math.max(left, right);
  if (!(strong > 0) || left < 0 || right < 0) return null;
  const weak = Math.min(left, right);
  const weakSide: BodySide = left < right ? 'left' : 'right';
  const exactPct = ((strong - weak) / strong) * 100;
  return {
    weakSide,
    strongSide: weakSide === 'left' ? 'right' : 'left',
    weak,
    strong,
    gap: Math.round((strong - weak) * 10) / 10,
    gapPct: Math.round(exactPct),
    material: exactPct >= SIDE_IMBALANCE_PCT,
  };
}
