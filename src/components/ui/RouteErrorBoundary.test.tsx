import { act, lazy, Suspense } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { APP_LOAD_RECOVERY_COPY } from '@/constants/errorRecovery';
import { STORAGE_KEYS } from '@/constants/storageKeys';
import { RouteErrorBoundary } from './RouteErrorBoundary';
import { ErrorBoundary as LayoutErrorBoundary } from './ErrorBoundary';
import { ErrorBoundary as AppErrorBoundary } from '@/components/ErrorBoundary';
import { reloadApp } from '@/lib/routing/chunkLoadRecovery';

vi.mock('@/lib/routing/chunkLoadRecovery', async (importOriginal) => ({
  ...await importOriginal<typeof import('@/lib/routing/chunkLoadRecovery')>(),
  reloadApp: vi.fn(),
}));
vi.mock('@/lib/utils/logger', () => ({ logger: { error: vi.fn() } }));
vi.mock('@sentry/react', () => ({ captureException: vi.fn() }));

let host: HTMLDivElement;
let root: Root;

beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.mocked(reloadApp).mockClear();
  sessionStorage.setItem(STORAGE_KEYS.DRAFT_ASSESSMENT, 'saved draft');
  sessionStorage.setItem(STORAGE_KEYS.ASSESSMENT_PHASE_ID, 'P3');
  host = document.createElement('div');
  root = createRoot(host);
});

afterEach(async () => {
  await act(async () => root.unmount());
  sessionStorage.clear();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const BOUNDARIES = [
  { name: 'assessment route', Boundary: RouteErrorBoundary },
  { name: 'dashboard layout', Boundary: LayoutErrorBoundary },
  { name: 'app shell', Boundary: AppErrorBoundary },
];

describe.each(BOUNDARIES)('$name recovery', ({ Boundary }) => {
  it('reloads a rejected lazy import instead of retrying its cached rejection', async () => {
    const load = vi.fn(() => Promise.reject(new TypeError('Failed to fetch dynamically imported module: /assets/Index-old.js')));
    const Page = lazy(load);
    await act(async () => root.render(
      <MemoryRouter>
        <Boundary title="Assessment error" body="Could not open the assessment.">
          <Suspense fallback="Loading"><Page /></Suspense>
        </Boundary>
      </MemoryRouter>,
    ));
    expect(host.textContent).toContain(APP_LOAD_RECOVERY_COPY.TITLE);
    const button = [...host.querySelectorAll('button')].find((node) => node.textContent?.includes(APP_LOAD_RECOVERY_COPY.ACTION));
    expect(button).toBeDefined();
    await act(async () => button?.click());
    expect(reloadApp).toHaveBeenCalledOnce();
    expect(load).toHaveBeenCalledOnce();
    expect(sessionStorage.getItem(STORAGE_KEYS.DRAFT_ASSESSMENT)).toBe('saved draft');
    expect(sessionStorage.getItem(STORAGE_KEYS.ASSESSMENT_PHASE_ID)).toBe('P3');
  });

  it('still retries an ordinary render failure without reloading', async () => {
    let broken = true;
    function Page() {
      if (broken) throw new Error('Temporary render failure');
      return <p>Assessment ready</p>;
    }
    await act(async () => root.render(
      <MemoryRouter>
        <Boundary title="Assessment error" body="Could not open the assessment."><Page /></Boundary>
      </MemoryRouter>,
    ));
    broken = false;
    const button = [...host.querySelectorAll('button')].find((node) => node.textContent === 'Try Again');
    expect(button).toBeDefined();
    await act(async () => button?.click());
    expect(host.textContent).toContain('Assessment ready');
    expect(reloadApp).not.toHaveBeenCalled();
  });
});
