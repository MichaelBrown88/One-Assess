import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { STORAGE_KEYS } from '@/constants/storageKeys';
import { readStoredGripMethod, shouldSkipGripMethodStep } from './gripMethodPrefill';

describe('readStoredGripMethod', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('returns null when nothing is stored', () => {
    expect(readStoredGripMethod()).toBeNull();
  });

  it('returns deadhang or pinch when stored', () => {
    localStorage.setItem(STORAGE_KEYS.LAST_GRIP_METHOD, 'deadhang');
    expect(readStoredGripMethod()).toBe('deadhang');
    localStorage.setItem(STORAGE_KEYS.LAST_GRIP_METHOD, 'pinch');
    expect(readStoredGripMethod()).toBe('pinch');
  });

  it('ignores unknown values', () => {
    localStorage.setItem(STORAGE_KEYS.LAST_GRIP_METHOD, 'dynamometer');
    expect(readStoredGripMethod()).toBeNull();
  });
});

describe('shouldSkipGripMethodStep', () => {
  it('skips when the method is already set and a result field follows', () => {
    expect(shouldSkipGripMethodStep('gripTestMethod', 'deadhang', false)).toBe(true);
    expect(shouldSkipGripMethodStep('gripTestMethod', 'pinch', false)).toBe(true);
  });

  it('does not skip the last field, empty method, or other fields', () => {
    expect(shouldSkipGripMethodStep('gripTestMethod', 'deadhang', true)).toBe(false);
    expect(shouldSkipGripMethodStep('gripTestMethod', '', false)).toBe(false);
    expect(shouldSkipGripMethodStep('gripDeadhangSeconds', 'deadhang', false)).toBe(false);
  });
});
