export function baselineClientRecord(
  clientName: string,
  organizationId: string,
  coachUid: string,
  createdAt: unknown,
  contact: { email?: string; phone?: string; dateOfBirth?: string; gender?: string } = {},
): Record<string, unknown> {
  return {
    clientName: clientName.trim(),
    clientNameLower: clientName.trim().toLowerCase(),
    organizationId,
    coachUid,
    assignedCoachUid: coachUid,
    status: 'active',
    assessmentCount: 0,
    createdAt,
    ...Object.fromEntries(Object.entries(contact).filter(([, value]) => typeof value === 'string' && value.trim())),
  };
}

/** An intake/draft profile is not a previous assessment, even if a placeholder score exists. */
export function priorAssessmentComparison(previous: Record<string, unknown>, score: number): { previousScore?: number; trend?: number } {
  const previousScore = previous.overallScore;
  if (previous.assessmentCount === 0 || typeof previousScore !== 'number' || !Number.isFinite(previousScore)) return {};
  return { previousScore, trend: score - previousScore };
}
