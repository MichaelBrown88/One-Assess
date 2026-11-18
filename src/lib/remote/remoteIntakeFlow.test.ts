import { describe, expect, it } from 'vitest';
import { INITIAL_LIFESTYLE_REMOTE } from '@/components/remote/PublicRemoteLifestyleFields';
import { initialBasicFromPrefill } from '@/lib/remote/remoteIntakePrefill';
import { INITIAL_PRE_ASSESSMENT_GOALS, isScreenValid } from './remoteIntakeFlow';
import type { RemoteIntakeScreen } from './remoteIntakeFlow';

const emptyParq: Record<string, string> = {};
const emptyPosture = {};
const basic = initialBasicFromPrefill({
  fullName: 'Test Client',
  email: 'test@example.com',
  phone: '',
  dateOfBirth: '1990-01-01',
  gender: 'male',
});

function optionalSelectScreen(optional: boolean): RemoteIntakeScreen {
  return {
    id: 'activityLevel',
    kind: 'select',
    field: 'activityLevel',
    label: 'Activity',
    options: [{ value: 'sedentary', label: 'Sedentary' }],
    domain: 'lifestyle',
    optional,
  };
}

describe('isScreenValid optional select', () => {
  it('lets the client skip an optional select with no value', () => {
    expect(
      isScreenValid(
        optionalSelectScreen(true),
        basic,
        INITIAL_LIFESTYLE_REMOTE,
        emptyParq,
        emptyPosture,
        INITIAL_PRE_ASSESSMENT_GOALS,
      ),
    ).toBe(true);
  });

  it('still requires a value when the same select is not optional', () => {
    expect(
      isScreenValid(
        optionalSelectScreen(false),
        basic,
        INITIAL_LIFESTYLE_REMOTE,
        emptyParq,
        emptyPosture,
        INITIAL_PRE_ASSESSMENT_GOALS,
      ),
    ).toBe(false);
  });
});
