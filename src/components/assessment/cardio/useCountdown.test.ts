import { describe, it, expect } from 'vitest';
import { formatCountdown } from './useCountdown';
import { shouldShowRecoveryStart } from './CardioTimerBlock';

describe('formatCountdown', () => {
  it('pads seconds and formats minutes', () => {
    expect(formatCountdown(0)).toBe('0:00');
    expect(formatCountdown(9)).toBe('0:09');
    expect(formatCountdown(60)).toBe('1:00');
    expect(formatCountdown(75)).toBe('1:15');
  });
});

describe('shouldShowRecoveryStart', () => {
  it('hides Start until the test has been stopped', () => {
    expect(shouldShowRecoveryStart(false, false)).toBe(false);
  });

  it('hides Start while recovery is already running', () => {
    expect(shouldShowRecoveryStart(true, true)).toBe(false);
  });

  it('shows Start after the test so the coach can restart a stopped or finished recovery', () => {
    expect(shouldShowRecoveryStart(true, false)).toBe(true);
  });
});
