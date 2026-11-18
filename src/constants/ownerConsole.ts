import type { OwnerBuyerType, OwnerNeedsYouReason, OwnerPayStatus } from '@shared/ownerConsole';
import { isIncompleteSetup } from '@shared/ownerConsole';
import type { StudioSnapshot } from '@/types/ownerConsole';

export const OWNER_CONSOLE_COPY = {
  title: 'Admin',
  product: 'One Assess',
  signOut: 'Sign out',
  loading: 'Loading…',
  nav: {
    overview: 'Overview',
    studios: 'Organisations',
  },
  unnamedStudio: 'Unnamed organisation',
  incompleteSetup: 'Setup incomplete',
  searchPlaceholder: 'Search organisations',
  pulse: {
    newStudios: 'New organisations',
    firstAssessments: 'First assessments',
    payingStudios: 'Paying',
    monthlyRevenue: 'Monthly revenue',
    assessmentsCompleted: 'Assessments',
    vsLastWeek: (lastWeek: number) => `${lastWeek} last week`,
  },
  trends: {
    revenue: 'Monthly revenue',
    studios: 'Organisations',
    assessments: 'Assessments',
    paying: 'Paying',
    trial: 'Trial',
    empty: 'Not enough history yet.',
    window: 'Last 90 days',
  },
  mix: {
    title: 'Status',
  },
  needsYou: {
    title: 'Needs you',
    empty: 'Nothing needs you.',
    unactivated: 'No first assessment',
    trial_ending: 'Trial ending',
    past_due: 'Payment failed',
    silent: 'Quiet after first assessment',
    studio: 'Organisation',
    reason: 'Reason',
  },
  studios: {
    title: 'Organisations',
    empty: 'No organisations yet.',
    assessmentsNone: '0',
    assessmentsOne: '1',
    assessmentsMany: (count: number) => String(count),
    lastActivityNone: '—',
    columns: {
      studio: 'Organisation',
      type: 'Type',
      joined: 'Joined',
      status: 'Status',
      assessments: 'Assessments',
      lastActivity: 'Last active',
    },
  },
  studio: {
    back: 'Organisations',
    joined: 'Joined',
    payStatus: 'Status',
    seats: 'Seats',
    firstAssessment: 'First assessment',
    noneYet: 'None',
    thisWeek: 'Assessments this week',
    lastActivity: 'Last active',
    email: 'Email',
    health: 'Health',
    money: 'Money',
    usage: 'Usage',
    revenue: 'Monthly revenue',
    trialEnds: 'Trial ends',
    assessments: 'Assessments',
    needsYou: 'Needs you',
    allClear: 'All clear',
    logInAsThem: 'Log in as them',
    pause: 'Pause',
    resume: 'Resume',
    pauseTitle: 'Pause this organisation?',
    pauseBody: 'They will not be able to run assessments until you resume.',
    pauseConfirm: 'Pause',
    cancel: 'Cancel',
    notFound: 'Organisation not found',
    buyerType: 'Type',
  },
  buyerType: {
    coach: 'Coach',
    gym: 'Gym',
  } satisfies Record<OwnerBuyerType, string>,
  payStatus: {
    trial: 'Trial',
    paying: 'Paying',
    past_due: 'Past due',
    cancelled: 'Cancelled',
    paused: 'Paused',
    internal: 'Free',
    setup: 'Setup incomplete',
  } satisfies Record<OwnerPayStatus | 'setup', string>,
} as const;

export const OWNER_TREND_DAYS = 90;

export const OWNER_NEEDS_YOU_COPY: Record<OwnerNeedsYouReason, string> = {
  unactivated: OWNER_CONSOLE_COPY.needsYou.unactivated,
  trial_ending: OWNER_CONSOLE_COPY.needsYou.trial_ending,
  past_due: OWNER_CONSOLE_COPY.needsYou.past_due,
  silent: OWNER_CONSOLE_COPY.needsYou.silent,
};

export function assessmentCountLabel(count: number): string {
  if (count <= 0) return OWNER_CONSOLE_COPY.studios.assessmentsNone;
  if (count === 1) return OWNER_CONSOLE_COPY.studios.assessmentsOne;
  return OWNER_CONSOLE_COPY.studios.assessmentsMany(count);
}

export function formatOwnerDay(date: Date): string {
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

export function studioPrimaryLabel(studio: Pick<StudioSnapshot, 'name' | 'ownerEmail'>): string {
  const name = studio.name.trim();
  if (name) return name;
  if (studio.ownerEmail.trim()) return studio.ownerEmail.trim();
  return OWNER_CONSOLE_COPY.unnamedStudio;
}

export function studioSecondaryLabel(studio: Pick<StudioSnapshot, 'name' | 'ownerEmail'>): string | null {
  const name = studio.name.trim();
  const email = studio.ownerEmail.trim();
  if (name && email) return email;
  if (!name && email) return OWNER_CONSOLE_COPY.incompleteSetup;
  if (!name) return OWNER_CONSOLE_COPY.incompleteSetup;
  return null;
}

export function studioStatusKey(
  studio: Pick<StudioSnapshot, 'name' | 'firstAssessmentAt' | 'payStatus'>,
): OwnerPayStatus | 'setup' {
  if (isIncompleteSetup(studio.name, studio.firstAssessmentAt?.getTime() ?? null)) {
    return 'setup';
  }
  return studio.payStatus;
}
