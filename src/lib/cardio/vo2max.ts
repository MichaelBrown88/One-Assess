/** Age-predicted maximum heart rate (Tanaka et al. 2001): 208 − 0.7 × age. 0 without an age. */
export function estimateHrMax(age: number): number {
  return age > 0 ? 208 - 0.7 * age : 0;
}
