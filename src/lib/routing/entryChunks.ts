/**
 * Chunks the deep-link entry needs. Started as soon as the shell evaluates so
 * they overlap the sign-in form and the profile read, instead of beginning
 * only after both have finished and the route fallback is already on screen.
 */
const LOADERS = {
  login: () => import('@/pages/Login'),
  dashboardLayout: () => import('@/pages/dashboard/DashboardLayout'),
  clientDetail: () => import('@/pages/client/ClientDetailLayout'),
  clientOverview: () => import('@/pages/client/ClientOverview'),
  assessment: () => import('@/pages/Index'),
} as const;

export type EntryChunkId = keyof typeof LOADERS;

const CLIENT_PROFILE = /^\/dashboard\/clients\/[^/]+\/?$/;

export function entryChunkIdsForLocation(pathname: string, search = ''): EntryChunkId[] {
  const onDashboard = pathname === '/dashboard' || pathname.startsWith('/dashboard/');
  const ids: EntryChunkId[] = [];
  if (pathname === '/login' || onDashboard) ids.push('login');
  if (!onDashboard) return ids;
  ids.push('dashboardLayout');
  if (CLIENT_PROFILE.test(pathname)) {
    ids.push('clientDetail', 'clientOverview');
    const resume = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search).get('resume');
    if (resume === '1') ids.push('assessment');
  }
  return ids;
}

const started = new Set<EntryChunkId>();

export function preloadEntryChunks(pathname: string, search = ''): void {
  for (const id of entryChunkIdsForLocation(pathname, search)) {
    if (started.has(id)) continue;
    started.add(id);
    void LOADERS[id]().catch(() => {
      started.delete(id);
    });
  }
}
