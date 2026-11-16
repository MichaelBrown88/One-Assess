/** Resolve against the current visible steps, never into the empty placeholder. */
export function resolveDraftPhaseIndex(
  phaseIds: readonly string[],
  phaseId: string | null | undefined,
  phaseIndex: number | null | undefined,
): number {
  const byId = phaseId ? phaseIds.indexOf(phaseId) : -1;
  if (byId >= 0) return byId;
  if (phaseId === 'P0' || phaseId === 'P1') return 0;
  // A stale index must never enter Results and publish an unfinished draft.
  const captureIds = phaseIds.filter((id) => id !== 'P7');
  const lastCapture = Math.max(0, captureIds.length - 1);
  return typeof phaseIndex === 'number' && Number.isInteger(phaseIndex)
    ? Math.max(0, Math.min(phaseIndex, lastCapture))
    : 0;
}

export function isPersistablePhaseId(value: unknown): value is string {
  return typeof value === 'string' && /^P[0-7]$/.test(value);
}
