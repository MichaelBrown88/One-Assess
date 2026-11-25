import { describe, expect, it } from 'vitest';
import { phaseDefinitions } from '@/lib/phaseConfig';
import { modulesForSection } from './moduleSectionMap';

describe('MODULE_SECTION_MAP', () => {
  // P0 and P7 are never filtered by modules.
  const filtered = phaseDefinitions.filter((p) => p.id !== 'P0' && p.id !== 'P7');

  it.each(filtered.flatMap((p) => (p.sections ?? []).map((s) => [p.id, s.id] as const)))(
    '%s section "%s" is controlled by at least one module',
    (_phaseId, sectionId) => {
      expect(modulesForSection(sectionId)).not.toEqual([]);
    },
  );

  it('body comp module shows the analyzer and tape sections', () => {
    expect(modulesForSection('inbody-results')).toContain('bodycomp');
    expect(modulesForSection('tape-measurements')).toContain('bodycomp');
  });
});
