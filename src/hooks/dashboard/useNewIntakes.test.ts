import { describe, expect, it } from 'vitest';
import { toNewIntake } from './useNewIntakes';

describe('toNewIntake', () => {
  it('summarises an intake doc for the list', () => {
    expect(toNewIntake('i1', { clientName: 'Test Client', email: 'a@b.test', submittedAt: { toMillis: () => 5 }, formData: { parq1: 'yes', parq2: 'no', parq12: 'yes', medicationsFlag: 'yes' } }))
      .toEqual({ id: 'i1', clientName: 'Test Client', email: 'a@b.test', submittedAtMs: 5, parqYesCount: 2 });
  });
  it('copes with missing fields', () => {
    expect(toNewIntake('i2', {})).toEqual({ id: 'i2', clientName: 'Unnamed client', submittedAtMs: null, parqYesCount: 0 });
  });
});
