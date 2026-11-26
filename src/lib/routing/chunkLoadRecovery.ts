/** A rejected lazy import is cached by React; resetting its boundary cannot retry it. */
export function isChunkLoadError(error: unknown): boolean {
  const message = error && typeof error === 'object' && 'message' in error
    ? error.message
    : error;
  return typeof message === 'string' && (
    /dynamically imported module/i.test(message) ||
    /importing a module script failed/i.test(message) ||
    /loading (?:css )?chunk [\w-]+ failed/i.test(message) ||
    /unable to preload css/i.test(message)
  );
}

export function appReloadUrl(href: string, nowMs = Date.now()): string {
  const latest = new URL(href);
  latest.searchParams.set('appUpdate', String(nowMs));
  return latest.toString();
}

/** Refresh the app shell without clearing the tab's persisted assessment or login return path. */
export function reloadApp(): void {
  window.location.replace(appReloadUrl(window.location.href));
}
