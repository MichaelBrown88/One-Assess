/** Capture time is distinct from the time a report was saved or published. */
export function assessmentDate(value: unknown, fallback?: Date | null): Date | null {
  const parsed = typeof value === 'string' && value.trim() ? new Date(value) : null;
  if (parsed && !Number.isNaN(parsed.getTime())) return parsed;
  return fallback && !Number.isNaN(fallback.getTime()) ? fallback : null;
}
