import { NORMATIVE_SCORING_DB } from '../clinical-data';
import { safeParse } from '../utils/numbers';

export const clamp = (n: number, min = 0, max = 100) => Math.max(min, Math.min(max, n));

/**
 * Helper to lookup normative scores based on age and gender.
 */
export function lookupNormativeScore(testName: string, gender: string, age: number, value: number): number {
  const genderKey = (gender || 'any').toLowerCase() as 'male' | 'female' | 'any';

  // Find benchmarks for this test and gender
  const benchmarks = NORMATIVE_SCORING_DB.filter(b =>
    b.testName.toLowerCase() === testName.toLowerCase() &&
    (b.gender === 'any' || b.gender === genderKey)
  );

  if (benchmarks.length === 0 || !(age > 0)) return 0;

  const range = (bracket: string): [number, number] => {
    if (bracket.includes('+')) return [safeParse(bracket.replace('+', '')), Infinity];
    const [min, max] = bracket.split('-').map(Number);
    return [min, max];
  };
  // Exact bracket, else the nearest one (youngest below the range, oldest above it).
  // Falling back to the first bracket judged e.g. a 72-year-old on 20-29 norms.
  const benchmark =
    benchmarks.find((b) => {
      const [min, max] = range(b.ageBracket);
      return age >= min && age <= max;
    }) ??
    [...benchmarks].sort((a, b) => {
      const distance = (x: typeof a) => {
        const [min, max] = range(x.ageBracket);
        return age < min ? min - age : age - max;
      };
      return distance(a) - distance(b);
    })[0];

  // Calculate score (0-100) based on thresholds
  const { poor, average, excellent } = benchmark.thresholds;

  // For HR, lower is better. For others, higher is better.
  const lowerIsBetter = testName.toLowerCase().includes('hr');

  if (lowerIsBetter) {
    if (value <= excellent) return 100;
    if (value >= poor) return 10;
    if (value <= average) {
      return 100 - ((value - excellent) / (average - excellent)) * 50;
    } else {
      return 50 - ((value - average) / (poor - average)) * 40;
    }
  } else {
    if (value >= excellent) return 100;
    if (value <= poor) return 10;
    if (value >= average) {
      return 50 + ((value - average) / (excellent - average)) * 50;
    } else {
      return 10 + ((value - poor) / (average - poor)) * 40;
    }
  }
}

/**
 * Age in whole years from a YYYY-MM-DD date of birth, at `at` (defaults to today).
 * Pass the assessment date so an old report doesn't drift as years pass.
 */
export function calculateAge(dob: string, at?: string | Date): number {
  if (!dob) return 0;
  const dobDate = new Date(dob);
  if (isNaN(dobDate.getTime())) return 0;
  const parsedRef = at ? new Date(at) : new Date();
  const ref = isNaN(parsedRef.getTime()) ? new Date() : parsedRef;
  let age = ref.getFullYear() - dobDate.getFullYear();
  const m = ref.getMonth() - dobDate.getMonth();
  if (m < 0 || (m === 0 && ref.getDate() < dobDate.getDate())) {
    age--;
  }
  return age;
}

/**
 * Piecewise-linear score from [value, score] points sorted by value.
 * Values beyond the ends take the end scores.
 */
export function scoreFromPoints(value: number, points: readonly (readonly [number, number])[]): number {
  if (points.length === 0) return 0;
  if (value <= points[0][0]) return points[0][1];
  for (let i = 1; i < points.length; i++) {
    const [x1, y1] = points[i];
    if (value <= x1) {
      const [x0, y0] = points[i - 1];
      return y0 + ((value - x0) / (x1 - x0)) * (y1 - y0);
    }
  }
  return points[points.length - 1][1];
}

/**
 * Mean of the measured scores. `null` means "not measured" and is left out;
 * a real score of 0 stays in. Returns null when nothing was measured.
 */
export function meanOfMeasured(scores: readonly (number | null)[]): number | null {
  const measured = scores.filter((s): s is number => s !== null && Number.isFinite(s));
  if (measured.length === 0) return null;
  return measured.reduce((a, b) => a + b, 0) / measured.length;
}
