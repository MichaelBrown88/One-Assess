import { describe, expect, it } from 'vitest';
import { CLIENT_REPORT_COPY, clientGoalPromiseRecomp, clientGoalPromiseWeightLoss } from './clientReport';
import { CLIENT_COPY_FORBIDDEN, sanitizeClientReportCopy } from '@/lib/reports/sanitizeClientReportCopy';

describe('client AXIS copy', () => {
  it('does not put lab jargon or year horizons on the v2 page strings', () => {
    const samples = [
      ...Object.values(CLIENT_REPORT_COPY),
      clientGoalPromiseWeightLoss('0.33', '4.0'),
      clientGoalPromiseRecomp('0.33', '4.0'),
    ];
    for (const sample of samples) {
      expect(sample, sample).not.toMatch(CLIENT_COPY_FORBIDDEN);
      expect(sample.toLowerCase(), sample).not.toMatch(/four months|\bin a year\b|1 year|90-day/);
    }
  });
});
