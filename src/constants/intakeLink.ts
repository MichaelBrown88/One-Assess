/** Coach-facing copy for convertIntake failure reasons (functions/src/intakeLink/handlers.ts). */
export const INTAKE_FAILURE_COPY: Record<string, string> = {
  name_taken: 'A client with this name already exists. Pick them, or give the new client a different name.',
  client_cap_reached: 'Your plan has no free client places. Upgrade or archive a client first.',
  other_coach_client: 'This email belongs to another coach’s client. Ask an admin to start it.',
  already_handled: 'Someone already started or dismissed this intake.',
  client_inactive: 'That client is archived. Reactivate them first.',
  client_mismatch: 'That client no longer matches this intake.',
};
