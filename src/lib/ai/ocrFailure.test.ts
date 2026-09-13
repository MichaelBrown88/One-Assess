import { describe, it, expect } from 'vitest';
import { classifyOcrFailure } from './ocrFailure';

describe('classifyOcrFailure', () => {
  it('returns credit for AICreditExhaustedError', () => {
    const err = new Error('No credits');
    err.name = 'AICreditExhaustedError';
    expect(classifyOcrFailure(err)).toBe('credit');
  });

  it('returns disabled for FeatureDisabledError', () => {
    const err = new Error('Off');
    err.name = 'FeatureDisabledError';
    expect(classifyOcrFailure(err)).toBe('disabled');
  });

  it('returns unreadable for empty reads, network errors, and unknown values', () => {
    expect(classifyOcrFailure(new Error('parse failed'))).toBe('unreadable');
    expect(classifyOcrFailure('timeout')).toBe('unreadable');
    expect(classifyOcrFailure(null)).toBe('unreadable');
  });
});
