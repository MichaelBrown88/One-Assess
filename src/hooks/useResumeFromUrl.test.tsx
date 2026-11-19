import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const resumeAssessment = vi.fn(async () => {});
vi.mock('@/hooks/useResumeAssessment', () => ({ useResumeAssessment: () => ({ resumeAssessment, resuming: false }) }));

import { useResumeFromUrl } from './useResumeFromUrl';

let container: HTMLDivElement;
let root: ReturnType<typeof createRoot>;
let search = '';

function Harness({ clientKey, ready = true }: { clientKey: string; ready?: boolean }) {
  useResumeFromUrl(clientKey, ready);
  search = useLocation().search;
  return null;
}

beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  resumeAssessment.mockClear();
  container = document.createElement('div');
  root = createRoot(container);
});
afterEach(async () => {
  await act(async () => root.unmount());
  vi.unstubAllGlobals();
});

const mount = (url: string, props: { clientKey: string; ready?: boolean }) =>
  act(async () => root.render(<MemoryRouter initialEntries={[url]}><Harness {...props} /></MemoryRouter>));

describe('useResumeFromUrl', () => {
  it('resumes once and removes the resume flag', async () => {
    await mount('/dashboard/clients/test-client?resume=1&tab=x', { clientKey: 'test-client' });
    await act(async () => root.render(<MemoryRouter initialEntries={['/dashboard/clients/test-client?resume=1']}><Harness clientKey="test-client" /></MemoryRouter>));
    expect(resumeAssessment).toHaveBeenCalledTimes(1);
    expect(resumeAssessment).toHaveBeenCalledWith('test-client');
    expect(search).not.toContain('resume');
  });

  it('waits until the page is ready', async () => {
    await mount('/dashboard/clients/test-client?resume=1', { clientKey: 'test-client', ready: false });
    expect(resumeAssessment).not.toHaveBeenCalled();
    expect(search).toContain('resume=1');
  });

  it('does nothing without the flag', async () => {
    await mount('/dashboard/clients/test-client', { clientKey: 'test-client' });
    expect(resumeAssessment).not.toHaveBeenCalled();
  });
});
