import { describe, it, expect } from 'vitest';
import { formatCountdown } from './useCountdown';

describe('formatCountdown', () => {
  it('pads seconds and formats minutes', () => {
    expect(formatCountdown(0)).toBe('0:00');
    expect(formatCountdown(9)).toBe('0:09');
    expect(formatCountdown(60)).toBe('1:00');
    expect(formatCountdown(75)).toBe('1:15');
  });
});
