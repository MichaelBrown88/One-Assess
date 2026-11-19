import { describe, expect, it } from 'vitest';
import { buildRemoteIntakeScreens, isScreenValid, INITIAL_PRE_ASSESSMENT_GOALS, visibleParqIds } from './remoteIntakeFlow';
import { initialBasicFromPrefill } from './remoteIntakePrefill';
import { INITIAL_LIFESTYLE_REMOTE } from '@/components/remote/PublicRemoteLifestyleFields';
import { readIntakeLinkPrefill } from '@/pages/PublicIntakeLink';

const LINK_KEYS = new Set(['fullName', 'email', 'parq1', 'medicationsFlag', 'activityLevel', 'clientGoals']);
const ids = (keys: Set<string>, includePosture?: boolean) =>
  buildRemoteIntakeScreens({ allowedKeys: keys, prefill: {}, gender: '', includePosture }).map((s) => s.id);

describe('intake link screens', () => {
  it('adds health screens after basic info and drops posture for the gym link', () => {
    const order = ids(LINK_KEYS, false);
    expect(order).toContain('parq');
    expect(order).toContain('medications');
    expect(order.indexOf('parq')).toBeGreaterThan(order.indexOf('recentActivity'));
    expect(order.indexOf('medications')).toBeLessThan(order.indexOf('lifestyle_activityLevel'));
    expect(order).not.toContain('posture');
  });

  it('leaves per-client links unchanged', () => {
    const order = ids(new Set(['activityLevel']));
    expect(order).not.toContain('parq');
    expect(order).not.toContain('medications');
    expect(order[order.length - 1]).toBe('posture');
  });

  it('asks the pregnancy questions only for women', () => {
    expect(visibleParqIds('male')).toHaveLength(7);
    expect(visibleParqIds('female')).toEqual(expect.arrayContaining(['parq12', 'parq13']));
  });

  it('requires every PAR-Q answer and medication details when taking medication', () => {
    const basic = { ...initialBasicFromPrefill({}), gender: 'male' };
    const check = (kind: 'parq' | 'medications', health: Record<string, string>) =>
      isScreenValid(kind === 'parq' ? { id: 'parq', kind: 'parq' } : { id: 'medications', kind: 'medications' }, basic, INITIAL_LIFESTYLE_REMOTE, health, {}, INITIAL_PRE_ASSESSMENT_GOALS);
    const allNo = Object.fromEntries(visibleParqIds('male').map((id) => [id, 'no']));
    expect(check('parq', allNo)).toBe(true);
    expect(check('parq', { ...allNo, parq3: '' })).toBe(false);
    expect(check('medications', { medicationsFlag: 'no' })).toBe(true);
    expect(check('medications', { medicationsFlag: 'yes' })).toBe(false);
    expect(check('medications', { medicationsFlag: 'yes', medicationsNotes: 'Example' })).toBe(true);
  });
});

describe('readIntakeLinkPrefill', () => {
  it('takes only name and email from the URL', () => {
    expect(readIntakeLinkPrefill(new URLSearchParams('name=Test%20Client&email=a@b.test&phone=123&dob=1990-01-01')))
      .toEqual({ fullName: 'Test Client', email: 'a@b.test' });
  });
  it('ignores blank or oversized values', () => {
    expect(readIntakeLinkPrefill(new URLSearchParams(`name=%20&email=${'x'.repeat(81)}`))).toEqual({});
  });
});
