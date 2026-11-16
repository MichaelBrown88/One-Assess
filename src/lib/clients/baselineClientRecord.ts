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
