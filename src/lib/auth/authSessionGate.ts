/**
 * The coach shell can route once Firebase Auth has answered and, for a signed-in
 * coach, the profile document is in memory. Organisation settings stream in
 * afterwards. Waiting for that second snapshot before the first paint left the
 * deep-link return path on the route fallback until the listen connected.
 */
export function isCoachSessionReady(input: {
  authResolved: boolean;
  hasUser: boolean;
  hasProfile: boolean;
}): boolean {
  if (!input.authResolved) return false;
  if (!input.hasUser) return true;
  return input.hasProfile;
}
