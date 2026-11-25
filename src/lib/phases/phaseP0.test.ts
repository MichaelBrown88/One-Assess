import { describe, expect, it } from 'vitest';
import { phaseP0 } from './phaseP0';

describe('phaseP0 basic info', () => {
  it('lets the coach skip date of birth when it is not known yet', () => {
    const dob = phaseP0.sections?.[0].fields.find((f) => f.id === 'dateOfBirth');
    expect(dob?.skippable).toBe(true);
  });
});
