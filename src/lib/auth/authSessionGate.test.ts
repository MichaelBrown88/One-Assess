import { describe, expect, it } from 'vitest';
import { isCoachSessionReady } from './authSessionGate';

describe('isCoachSessionReady', () => {
  it('stays shut until auth has answered', () => {
    expect(isCoachSessionReady({ authResolved: false, hasUser: false, hasProfile: false })).toBe(false);
  });

  it('opens for a signed-out session without a profile', () => {
    expect(isCoachSessionReady({ authResolved: true, hasUser: false, hasProfile: false })).toBe(true);
  });

  it('opens once the signed-in coach profile is loaded, without organisation settings', () => {
    expect(isCoachSessionReady({ authResolved: true, hasUser: true, hasProfile: false })).toBe(false);
    expect(isCoachSessionReady({ authResolved: true, hasUser: true, hasProfile: true })).toBe(true);
  });
});
