/**
 * Which phase sections each org module toggle controls.
 *
 * Keep the section ids in step with `src/lib/phases/*`. A section missing from
 * this map is silently hidden whenever org modules are set (every org gets the
 * defaults merged in), which is how the analyzer and tape screens disappeared.
 * `moduleSectionMap.test.ts` checks every section is reachable.
 */
export const BODY_COMP_SECTION_IDS = ['inbody-results', 'tape-measurements'] as const;

export const MODULE_SECTION_MAP: Record<string, readonly string[]> = {
  parq: ['parq'],
  bodycomp: BODY_COMP_SECTION_IDS,
  fitness: ['fitness-assessment'],
  posture: ['posture'],
  overheadSquat: ['overhead-squat'],
  hinge: ['hinge-assessment'],
  lunge: ['lunge-assessment'],
  /** Legacy module key — maps to movement pattern sections (standalone mobility screens removed). */
  mobility: ['overhead-squat', 'hinge-assessment', 'lunge-assessment'],
  strength: ['strength-endurance'],
  lifestyle: ['lifestyle-overview'],
};

/** Module keys that enable a section (a section shows if any of them is on). */
export function modulesForSection(sectionId: string): string[] {
  return Object.entries(MODULE_SECTION_MAP)
    .filter(([, sectionIds]) => sectionIds.includes(sectionId))
    .map(([key]) => key);
}
