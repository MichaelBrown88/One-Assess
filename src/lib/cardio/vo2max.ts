/**
 * VO2max estimate from heart rates (Uth, Sørensen, Overgaard & Pedersen 2004,
 * Eur J Appl Physiol 91:111–115): VO2max ≈ 15.3 × HRmax / HRrest.
 * HRmax is estimated with Tanaka et al. 2001: 208 − 0.7 × age.
 *
 * Uses RESTING heart rate. Using a post-exercise reading instead roughly halves
 * the estimate. Returns 0 when it can't be estimated.
 */
export function estimateHrMax(age: number): number {
  return age > 0 ? 208 - 0.7 * age : 0;
}

export function estimateVo2maxUth(age: number, restingHr: number): number {
  const hrMax = estimateHrMax(age);
  if (hrMax <= 0 || !(restingHr > 0)) return 0;
  return Math.round(((15.3 * hrMax) / restingHr) * 10) / 10;
}
