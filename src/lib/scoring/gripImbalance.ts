import { safeParse } from '@/lib/utils/numbers';

/**
 * Left/right grip gap (relative to the stronger hand) that counts as a real
 * imbalance. 10% is the handgrip-asymmetry cut-off used in research (e.g.
 * McGrath et al. 2020) and sits just above the usual dominant-hand advantage,
 * so ordinary handedness isn't flagged.
 */
export const GRIP_IMBALANCE_PCT = 10;

export type GripSide = 'left' | 'right';

export interface GripImbalance {
  weakSide: GripSide;
  strongSide: GripSide;
  weakKg: number;
  strongKg: number;
  gapKg: number;
  /** Whole-number percent gap relative to the stronger hand. */
  gapPct: number;
  material: boolean;
}

/** Compares left and right dynamometer grip. Null unless both hands were tested. */
export function assessGripImbalance(
  leftKg: string | number | null | undefined,
  rightKg: string | number | null | undefined,
): GripImbalance | null {
  const left = safeParse(leftKg);
  const right = safeParse(rightKg);
  if (!(left > 0) || !(right > 0)) return null;
  const weakSide: GripSide = left < right ? 'left' : 'right';
  const strongKg = Math.max(left, right);
  const weakKg = Math.min(left, right);
  const gapKg = Math.round((strongKg - weakKg) * 10) / 10;
  const exactPct = ((strongKg - weakKg) / strongKg) * 100;
  return {
    weakSide,
    strongSide: weakSide === 'left' ? 'right' : 'left',
    weakKg,
    strongKg,
    gapKg,
    gapPct: Math.round(exactPct),
    material: exactPct >= GRIP_IMBALANCE_PCT,
  };
}
