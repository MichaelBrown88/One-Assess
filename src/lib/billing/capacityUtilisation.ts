export type CapacityUtilisationTone = 'ok' | 'warn' | 'full';

export function capacityUtilisationRatio(activeClients: number, clientLimit: number): number {
  const safeLimit = Math.max(1, clientLimit);
  return Math.min(activeClients / safeLimit, 1);
}

export function capacityUtilisationTone(ratio: number): CapacityUtilisationTone {
  if (ratio >= 1) return 'full';
  if (ratio >= 0.8) return 'warn';
  return 'ok';
}
