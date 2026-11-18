import { describe, expect, it } from 'vitest';
import { CLIENT_REPORT_COPY, clientGoalPromiseRecomp, clientGoalPromiseWeightLoss, clientLifestyleNutritionAdvice, LIFESTYLE_FACTOR_ADVICE } from './clientReport';
import { CLIENT_COPY_FORBIDDEN } from '@/lib/reports/sanitizeClientReportCopy';

function asCopyStrings(values: unknown[]): string[] {
  return values.filter((value): value is string => typeof value === 'string');
}

describe('client AXIS copy', () => {
  it('does not put lab jargon or year horizons on the v2 page strings', () => {
    const samples = asCopyStrings([
      ...Object.values(CLIENT_REPORT_COPY),
      CLIENT_REPORT_COPY.planFuelNote,
      ...Object.values(LIFESTYLE_FACTOR_ADVICE),
      clientLifestyleNutritionAdvice(2150, 160),
      clientGoalPromiseWeightLoss('2.6'),
      clientGoalPromiseRecomp('2.6'),
    ]);
    for (const sample of samples) {
      expect(sample, sample).not.toMatch(CLIENT_COPY_FORBIDDEN);
      expect(sample.toLowerCase(), sample).not.toMatch(/four months|\bin a year\b|1 year|90-day/);
    }
  });
});
