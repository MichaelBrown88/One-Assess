import { describe, expect, it } from 'vitest';
import { formatAssessmentReportDate } from './formatAssessmentReportDate';

describe('formatAssessmentReportDate', () => {
  it('prints the original calendar date and ignores missing values', () => {
    expect(formatAssessmentReportDate(new Date('2026-09-08T12:00:00Z'))).toMatch(/Sep/);
    expect(formatAssessmentReportDate(new Date('2026-09-08T12:00:00Z'))).toMatch(/2026/);
    expect(formatAssessmentReportDate(null)).toBe('');
    expect(formatAssessmentReportDate(new Date('invalid'))).toBe('');
  });
});
