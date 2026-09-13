import { describe, it, expect } from 'vitest';
import { LEGAL_PAGES_UPDATED_LABEL } from './legalPages';

describe('LEGAL_PAGES_UPDATED_LABEL', () => {
  it('is a static month-year, not a live clock', () => {
    expect(LEGAL_PAGES_UPDATED_LABEL).toMatch(/^[A-Z][a-z]+ \d{4}$/);
    expect(LEGAL_PAGES_UPDATED_LABEL).not.toBe(
      new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
    );
  });
});
