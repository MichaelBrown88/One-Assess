import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const orgDoc = vi.hoisted(() => ({ intakeLink: undefined as unknown }));
const manage = vi.hoisted(() => vi.fn());
vi.mock('@/services/firebase', () => ({ getDb: () => ({}) }));
vi.mock('firebase/firestore', () => ({ doc: () => ({}), getDoc: async () => ({ get: (k: string) => (k === 'intakeLink' ? orgDoc.intakeLink : undefined) }) }));
vi.mock('@/services/intakeLinkClient', async (original) => ({
  ...(await original<object>()),
  manageIntakeLink: manage,
}));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));

import { IntakeLinkCard } from './IntakeLinkCard';

let container: HTMLDivElement;
let root: ReturnType<typeof createRoot>;
beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  manage.mockReset();
  container = document.createElement('div');
  root = createRoot(container);
});
afterEach(async () => { await act(async () => root.unmount()); vi.unstubAllGlobals(); });

const mount = async () => {
  await act(async () => root.render(<IntakeLinkCard organizationId="org-test" origin="https://one-assess.test" />));
  await act(async () => { await Promise.resolve(); });
};

describe('IntakeLinkCard', () => {
  it('shows the link, copy and QR when on', async () => {
    orgDoc.intakeLink = { token: 'A'.repeat(22), enabled: true };
    await mount();
    expect(container.textContent).toContain(`https://one-assess.test/start/${'A'.repeat(22)}`);
    expect(container.querySelector('svg[height]')).not.toBeNull();
    expect(container.querySelector('[role="switch"]')?.getAttribute('aria-checked')).toBe('true');
  });

  it('switches the link on', async () => {
    orgDoc.intakeLink = undefined;
    manage.mockResolvedValue({ token: 'B'.repeat(22), enabled: true });
    await mount();
    expect(container.textContent).toContain('The link is off');
    await act(async () => (container.querySelector('[role="switch"]') as HTMLButtonElement).click());
    expect(manage).toHaveBeenCalledWith('enable');
    expect(container.textContent).toContain(`/start/${'B'.repeat(22)}`);
  });

  it('regenerates the link', async () => {
    orgDoc.intakeLink = { token: 'A'.repeat(22), enabled: true };
    manage.mockResolvedValue({ token: 'C'.repeat(22), enabled: true });
    await mount();
    const regen = Array.from(container.querySelectorAll('button')).find((b) => b.textContent?.includes('Regenerate'));
    await act(async () => regen?.click());
    expect(manage).toHaveBeenCalledWith('regenerate');
    expect(container.textContent).toContain(`/start/${'C'.repeat(22)}`);
  });
});
