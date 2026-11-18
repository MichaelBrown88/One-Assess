/**
 * Formats an assessment timestamp for the AXIS document.
 * Never substitutes "today" — missing dates stay blank so we do not rewrite history.
 */
export function formatAssessmentReportDate(date: Date | null | undefined): string {
  if (!date || Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
