import { describe, expect, it } from 'vitest';
import { assessmentCountLabel } from '@/constants/ownerConsole';
import {
  effectiveAssessmentsThisWeek,
  emptyAssessmentActivity,
  emptyWeekCounts,
  isFullBaselineAssessment,
  isIncompleteSetup,
  mapBuyerType,
  mapPayStatus,
  mergeAssessmentTimestamp,
  nextAssessmentsThisWeek,
  OWNER_CONSOLE,
  OWNER_NEEDS_YOU,
  OWNER_PAY_STATUS,
  resolveNeedsYou,
  resolveStudioPayStatus,
  shouldCountStudio,
  shouldRollPulseWeek,
  shouldSurfaceNeedsYou,
  snapshotRevenuePence,
  startOfIsoWeekUtc,
} from '@shared/ownerConsole';

describe('startOfIsoWeekUtc', () => {
  it('returns Monday for a Wednesday', () => {
    const wed = new Date(Date.UTC(2026, 8, 16, 15, 0, 0));
    expect(startOfIsoWeekUtc(wed).toISOString()).toBe('2026-09-14T00:00:00.000Z');
  });

  it('returns the same Monday for that Monday', () => {
    const mon = new Date(Date.UTC(2026, 8, 14, 0, 0, 0));
    expect(startOfIsoWeekUtc(mon).toISOString()).toBe('2026-09-14T00:00:00.000Z');
  });

  it('treats Sunday as the end of the previous week', () => {
    const sun = new Date(Date.UTC(2026, 8, 20, 23, 0, 0));
    expect(startOfIsoWeekUtc(sun).toISOString()).toBe('2026-09-14T00:00:00.000Z');
  });
});

describe('shouldRollPulseWeek', () => {
  it('rolls when nothing is stored', () => {
    expect(shouldRollPulseWeek(null, new Date(Date.UTC(2026, 8, 16)))).toBe(true);
  });

  it('does not roll inside the same week', () => {
    const week = startOfIsoWeekUtc(new Date(Date.UTC(2026, 8, 16)));
    expect(shouldRollPulseWeek(week, new Date(Date.UTC(2026, 8, 18)))).toBe(false);
  });

  it('rolls once the next Monday starts', () => {
    const week = startOfIsoWeekUtc(new Date(Date.UTC(2026, 8, 16)));
    expect(shouldRollPulseWeek(week, new Date(Date.UTC(2026, 8, 21)))).toBe(true);
  });
});

describe('mapPayStatus', () => {
  it('maps Stripe-style active and stored paying to paying', () => {
    expect(mapPayStatus('active')).toBe(OWNER_PAY_STATUS.PAYING);
    expect(mapPayStatus('paying')).toBe(OWNER_PAY_STATUS.PAYING);
  });

  it('keeps trial, past due, cancelled, and paused', () => {
    expect(mapPayStatus('trial')).toBe(OWNER_PAY_STATUS.TRIAL);
    expect(mapPayStatus('past_due')).toBe(OWNER_PAY_STATUS.PAST_DUE);
    expect(mapPayStatus('cancelled')).toBe(OWNER_PAY_STATUS.CANCELLED);
    expect(mapPayStatus('paused')).toBe(OWNER_PAY_STATUS.PAUSED);
  });

  it('maps internal and free to the house-studio status', () => {
    expect(mapPayStatus('internal')).toBe(OWNER_PAY_STATUS.INTERNAL);
    expect(mapPayStatus('free')).toBe(OWNER_PAY_STATUS.INTERNAL);
  });

  it('defaults unknown status to trial', () => {
    expect(mapPayStatus('none')).toBe(OWNER_PAY_STATUS.TRIAL);
    expect(mapPayStatus(undefined)).toBe(OWNER_PAY_STATUS.TRIAL);
  });
});

describe('resolveStudioPayStatus', () => {
  it('treats the founder gym as free even if Stripe leftover says cancelled', () => {
    expect(
      resolveStudioPayStatus({ isInternal: true, status: 'cancelled' }),
    ).toBe(OWNER_PAY_STATUS.INTERNAL);
    expect(
      resolveStudioPayStatus({ isInternal: true, status: 'active' }),
    ).toBe(OWNER_PAY_STATUS.INTERNAL);
  });

  it('does not count internal studios as paying revenue', () => {
    expect(snapshotRevenuePence(OWNER_PAY_STATUS.INTERNAL, 14900)).toBe(0);
    expect(snapshotRevenuePence(OWNER_PAY_STATUS.CANCELLED, 14900)).toBe(0);
    expect(snapshotRevenuePence(OWNER_PAY_STATUS.PAYING, 14900)).toBe(14900);
  });
});

describe('shouldCountStudio', () => {
  it('counts a real studio', () => {
    expect(shouldCountStudio({ subscription: { plan: 'starter' } })).toBe(true);
  });

  it('skips test, sandbox metadata, and sandbox plan', () => {
    expect(shouldCountStudio({ metadata: { isTest: true }, subscription: { plan: 'starter' } })).toBe(false);
    expect(shouldCountStudio({ metadata: { isSandbox: true }, subscription: { plan: 'starter' } })).toBe(false);
    expect(shouldCountStudio({ metadata: { isDeleted: true }, subscription: { plan: 'starter' } })).toBe(false);
    expect(shouldCountStudio({ subscription: { plan: 'sandbox' } })).toBe(false);
  });

  it('skips empty stats-only parent documents', () => {
    expect(shouldCountStudio({})).toBe(false);
    expect(shouldCountStudio({ name: '' })).toBe(false);
  });

  it('counts an onboarding shell that already has billing identity', () => {
    expect(shouldCountStudio({ subscription: { plan: 'starter', billingEmail: 'a@b.com' } })).toBe(true);
  });
});

describe('mapBuyerType', () => {
  it('maps gym businesses vs solo coaches', () => {
    expect(mapBuyerType('gym')).toBe('gym');
    expect(mapBuyerType('gym_chain')).toBe('gym');
    expect(mapBuyerType('solo_coach')).toBe('coach');
    expect(mapBuyerType('coach')).toBe('coach');
  });
});

describe('isFullBaselineAssessment', () => {
  it('counts full baseline sessions only', () => {
    expect(isFullBaselineAssessment({ assessmentType: 'full' })).toBe(true);
    expect(isFullBaselineAssessment({ type: 'full-assessment' })).toBe(true);
    expect(isFullBaselineAssessment({ type: 'full' })).toBe(true);
  });

  it('ignores pillar and partial sessions', () => {
    expect(isFullBaselineAssessment({ assessmentType: 'pillar', type: 'pillar-strength' })).toBe(false);
    expect(isFullBaselineAssessment({ type: 'partial-bodycomp' })).toBe(false);
    expect(isFullBaselineAssessment({})).toBe(false);
  });
});

describe('incomplete setup vs needs you', () => {
  it('treats a nameless studio with no assessment as incomplete setup', () => {
    expect(isIncompleteSetup('', null)).toBe(true);
    expect(isIncompleteSetup('One Fitness', null)).toBe(false);
  });

  it('does not put incomplete signups on the call list', () => {
    expect(shouldSurfaceNeedsYou(OWNER_NEEDS_YOU.UNACTIVATED, '', null)).toBe(false);
    expect(shouldSurfaceNeedsYou(OWNER_NEEDS_YOU.UNACTIVATED, 'One Fitness', null)).toBe(true);
    expect(shouldSurfaceNeedsYou(OWNER_NEEDS_YOU.PAST_DUE, '', null)).toBe(true);
  });
});

describe('resolveNeedsYou', () => {
  const now = Date.UTC(2026, 8, 15, 12);

  it('puts past due first', () => {
    expect(
      resolveNeedsYou(
        {
          payStatus: OWNER_PAY_STATUS.PAST_DUE,
          firstAssessmentAtMs: null,
          assessmentCount: 0,
          lastActivityAtMs: null,
          trialEndsAtMs: now + 86400000,
        },
        now,
      ),
    ).toBe(OWNER_NEEDS_YOU.PAST_DUE);
  });

  it('flags a trial ending within three days', () => {
    expect(
      resolveNeedsYou(
        {
          payStatus: OWNER_PAY_STATUS.TRIAL,
          firstAssessmentAtMs: now,
          assessmentCount: 2,
          lastActivityAtMs: now,
          trialEndsAtMs: now + 2 * 86400000,
        },
        now,
      ),
    ).toBe(OWNER_NEEDS_YOU.TRIAL_ENDING);
  });

  it('flags signup with no first assessment', () => {
    expect(
      resolveNeedsYou(
        {
          payStatus: OWNER_PAY_STATUS.TRIAL,
          firstAssessmentAtMs: null,
          assessmentCount: 0,
          lastActivityAtMs: null,
          trialEndsAtMs: now + 10 * 86400000,
        },
        now,
      ),
    ).toBe(OWNER_NEEDS_YOU.UNACTIVATED);
  });

  it('flags a single assessment then two weeks of silence', () => {
    expect(
      resolveNeedsYou(
        {
          payStatus: OWNER_PAY_STATUS.PAYING,
          firstAssessmentAtMs: now - OWNER_CONSOLE.SILENT_AFTER_MS - 1000,
          assessmentCount: 1,
          lastActivityAtMs: now - OWNER_CONSOLE.SILENT_AFTER_MS - 1000,
          trialEndsAtMs: null,
        },
        now,
      ),
    ).toBe(OWNER_NEEDS_YOU.SILENT);
  });

  it('does not flag cancelled studios or active repeat users', () => {
    expect(
      resolveNeedsYou(
        {
          payStatus: OWNER_PAY_STATUS.CANCELLED,
          firstAssessmentAtMs: null,
          assessmentCount: 0,
          lastActivityAtMs: null,
          trialEndsAtMs: null,
        },
        now,
      ),
    ).toBeNull();

    expect(
      resolveNeedsYou(
        {
          payStatus: OWNER_PAY_STATUS.PAYING,
          firstAssessmentAtMs: now - 86400000,
          assessmentCount: 3,
          lastActivityAtMs: now - 3600000,
          trialEndsAtMs: null,
        },
        now,
      ),
    ).toBeNull();
  });

  it('does not treat an internal house studio as cancelled or a call-list item', () => {
    expect(
      resolveNeedsYou(
        {
          payStatus: OWNER_PAY_STATUS.INTERNAL,
          firstAssessmentAtMs: now - 7 * 86400000,
          assessmentCount: 40,
          lastActivityAtMs: now - 7 * 86400000,
          trialEndsAtMs: null,
        },
        now,
      ),
    ).toBeNull();
  });
});

describe('weekly assessment counters', () => {
  it('zeros a stale week on read', () => {
    const now = new Date(Date.UTC(2026, 8, 16));
    const lastWeek = startOfIsoWeekUtc(new Date(Date.UTC(2026, 8, 7))).getTime();
    expect(effectiveAssessmentsThisWeek(4, lastWeek, now)).toBe(0);
  });

  it('keeps the count inside the current week', () => {
    const now = new Date(Date.UTC(2026, 8, 16));
    const week = startOfIsoWeekUtc(now).getTime();
    expect(effectiveAssessmentsThisWeek(4, week, now)).toBe(4);
  });

  it('starts a new week counter at 1', () => {
    const now = new Date(Date.UTC(2026, 8, 21));
    const lastWeek = startOfIsoWeekUtc(new Date(Date.UTC(2026, 8, 16))).getTime();
    expect(nextAssessmentsThisWeek(5, lastWeek, now)).toEqual({
      assessmentsThisWeek: 1,
      assessmentWeekStartMs: startOfIsoWeekUtc(now).getTime(),
    });
  });

  it('starts empty week counts at zero', () => {
    expect(emptyWeekCounts()).toEqual({
      newStudios: 0,
      firstAssessments: 0,
      assessmentsCompleted: 0,
    });
  });
});

describe('mergeAssessmentTimestamp', () => {
  it('counts a client this ISO week as last week from a Tuesday after the session', () => {
    const now = new Date(Date.UTC(2026, 8, 15, 14, 0, 0));
    const sample = new Date('2026-09-08T05:59:23.159Z');
    const otherClient = new Date('2026-09-07T05:00:13.039Z');
    const folded = [sample, otherClient].reduce(
      (acc, ts) => mergeAssessmentTimestamp(acc, ts, now),
      emptyAssessmentActivity(),
    );
    expect(folded.assessmentCount).toBe(2);
    expect(folded.lastActivityAt?.toISOString()).toBe(sample.toISOString());
    expect(folded.assessmentsThisWeek).toBe(0);
    expect(folded.assessmentsLastWeek).toBe(2);
  });
});

describe('assessmentCountLabel', () => {
  it('uses none / one / many', () => {
    expect(assessmentCountLabel(0)).toBe('0');
    expect(assessmentCountLabel(1)).toBe('1');
    expect(assessmentCountLabel(4)).toBe('4');
  });
});
