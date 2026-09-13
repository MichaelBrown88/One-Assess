/**
 * Client-facing copy scrubber: strips legacy dev prefixes, translates clinical
 * movement labels into plain language, and removes lab units clients don't need.
 *
 * Source copy should already be plain. This is a last-line filter so jargon
 * cannot leak onto the AXIS page.
 */

/** Ordered clinical → plain-language replacements (longest/most specific first). */
const PLAIN_LANGUAGE_MAP: ReadonlyArray<[RegExp, string]> = [
  [/knee valgus \(knees cave inward\)/gi, 'Knees cave inward'],
  [/knee varus \(knees bow outward\)/gi, 'Knees bow outward'],
  [/valgus \(knees cave in\)/gi, 'Knees cave inward'],
  [/varus \(knees bow out\)/gi, 'Knees bow outward'],
  [/\bexcessive pronation\b/gi, 'Arches roll inward'],
  [/\bkyphosis\b/gi, 'rounded upper back'],
  [/\blordosis\b/gi, 'arched lower back'],
  [/\bVO₂\s*max\b/gi, 'Fitness level'],
  [/\bVO2\s*max\b/gi, 'Fitness level'],
  [/\bVO₂\b/gi, 'fitness'],
  [/\bVO2\b/gi, 'fitness'],
  [/\bml\/kg\/min\b/gi, ''],
  [/\bperiodise\b/gi, 'pace'],
  [/\bperiodize\b/gi, 'pace'],
  [/\bdeloads?\b/gi, 'easier weeks'],
  [/\bhypertrophy\b/gi, 'muscle growth'],
  [/\bprogressive overload\b/gi, 'add a little weight or a rep when it feels easy'],
  [/\bcalorie deficit\b/gi, 'eat a little less than you burn'],
  [/\bZone\s*2\b/gi, 'easy talking pace'],
  [/\bkcal\b/gi, 'calories'],
  [/\bskeletal muscle\b/gi, 'muscle'],
  [/\bHRR\b/g, 'heart recovery'],
];

export function sanitizeClientReportCopy(text: string): string {
  let out = text
    .replace(/^Placeholder:\s*/i, '')
    .replace(/\bPlaceholder:\s*/gi, '');

  for (const [pattern, replacement] of PLAIN_LANGUAGE_MAP) {
    out = out.replace(pattern, replacement);
  }

  out = out.replace(/\s{2,}/g, ' ').replace(/\s+,/g, ',');

  return out.trim();
}

/** Terms that must never appear on the client AXIS page. */
export const CLIENT_COPY_FORBIDDEN =
  /VO₂|VO2|\bSMM\b|\bHRR\b|ml\/kg\/min|periodise|periodize|deload|hypertrophy|\bkcal\b|Zone\s*2|calorie deficit|progressive overload/i;
