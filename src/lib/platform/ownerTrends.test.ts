import { describe, expect, it } from 'vitest';
import { formatTrendTick, mapMetricsHistoryToTrends, payMixFromStudios } from '@/lib/platform/ownerTrends';
import type { PlatformMetricsHistoryEntry } from '@/types/platform';
import type { StudioSnapshot } from '@/types/ownerConsole';

function history(overrides: Partial<PlatformMetricsHistoryEntry> & { date: string }): PlatformMetricsHistoryEntry {
  return {
    mrrCents: 0,
    activeOrgs: 0,
    trialOrgs: 0,
    totalOrgs: 0,
    totalAssessments: 0,
    assessmentsThisMonth: 0,
    aiCostsMtdCents: 0,
    totalAiCostsCents: 0,
    ...overrides,
  };
}

function studio(overrides: Partial<StudioSnapshot>): StudioSnapshot {
  return {
    orgId: 'org-1',
    name: 'Studio',
    ownerEmail: 'a@b.com',
    joinedAt: new Date('2026-01-01T00:00:00.000Z'),
    payStatus: 'trial',
    buyerType: 'gym',
    trialEndsAt: null,
    seatCount: 1,
    assessmentCount: 1,
    firstAssessmentAt: new Date('2026-01-02T00:00:00.000Z'),
    lastActivityAt: null,
    assessmentsThisWeek: 0,
    assessmentWeekStartMs: null,
    monthlyRevenueGbpPence: 0,
    needsYou: false,
    needsYouReason: null,
    ...overrides,
  };
}

describe('mapMetricsHistoryToTrends', () => {
  it('drops empty calendar days so charts do not crash to zero', () => {
    const points = mapMetricsHistoryToTrends([
      history({ date: '2026-09-01' }),
      history({ date: '2026-09-02', mrrCents: 9900, activeOrgs: 2, totalOrgs: 3, totalAssessments: 40 }),
      history({ date: '2026-09-03' }),
    ]);
    expect(points).toEqual([
      {
        date: '2026-09-02',
        monthlyRevenueGbpPence: 9900,
        payingStudios: 2,
        trialStudios: 0,
        totalStudios: 3,
        assessments: 40,
      },
    ]);
  });

  it('clamps negative revenue so the money chart cannot go below zero', () => {
    const points = mapMetricsHistoryToTrends([
      history({ date: '2026-09-04', mrrCents: -16000, totalAssessments: 10 }),
    ]);
    expect(points[0]?.monthlyRevenueGbpPence).toBe(0);
  });
});

describe('formatTrendTick', () => {
  it('formats an ISO date as a short British day', () => {
    expect(formatTrendTick('2026-09-02')).toMatch(/^2 Sep/);
  });
});

describe('payMixFromStudios', () => {
  it('groups by operator status and skips empty buckets', () => {
    const rows = payMixFromStudios([
      studio({ orgId: 'a', payStatus: 'paying', name: 'A' }),
      studio({ orgId: 'b', payStatus: 'paying', name: 'B' }),
      studio({ orgId: 'c', payStatus: 'trial', name: 'C' }),
      studio({ orgId: 'e', payStatus: 'internal', name: 'One Fitness' }),
      studio({ orgId: 'd', name: '', firstAssessmentAt: null, payStatus: 'trial' }),
    ]);
    expect(rows).toEqual([
      { key: 'paying', count: 2, pct: 40 },
      { key: 'internal', count: 1, pct: 20 },
      { key: 'trial', count: 1, pct: 20 },
      { key: 'setup', count: 1, pct: 20 },
    ]);
  });
});
