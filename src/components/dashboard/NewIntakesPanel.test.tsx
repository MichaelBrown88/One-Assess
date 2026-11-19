import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const intakes = vi.hoisted(() => ({ list: [] as Array<{ id: string; clientName: string; email?: string; submittedAtMs: number | null; parqYesCount: number }> }));
const convert = vi.hoisted(() => vi.fn());
vi.mock('@/hooks/dashboard/useNewIntakes', () => ({
  useNewIntakes: () => ({ intakes: intakes.list, loading: false, refresh: vi.fn(), remove: (id: string) => { intakes.list = intakes.list.filter((i) => i.id !== id); } }),
}));
vi.mock('@/services/intakeLinkClient', () => ({
  convertIntake: convert,
  intakeFailureReason: (e: { reason?: string }) => e.reason ?? 'network',
}));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));

import { NewIntakesPanel } from './NewIntakesPanel';

let container: HTMLDivElement;
let root: ReturnType<typeof createRoot>;
let path = '';
function Where() { const l = useLocation(); path = l.pathname + l.search; return null; }

beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  intakes.list = [{ id: 'i1', clientName: 'Test Client', email: 'client@example.test', submittedAtMs: 1, parqYesCount: 1 }];
  convert.mockReset();
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});
afterEach(async () => { await act(async () => root.unmount()); container.remove(); vi.unstubAllGlobals(); });

const mount = () => act(async () => root.render(
  <MemoryRouter initialEntries={['/dashboard/clients']}><Routes><Route path="*" element={<><NewIntakesPanel organizationId="org-test" /><Where /></>} /></Routes></MemoryRouter>,
));
const button = (label: string) => Array.from(document.querySelectorAll('button')).find((b) => b.textContent?.startsWith(label));

describe('NewIntakesPanel', () => {
  it('hides itself when there is nothing new', async () => {
    intakes.list = [];
    await mount();
    expect(container.innerHTML).toBe('');
  });

  it('lists intakes with health flags and opens the new draft', async () => {
    convert.mockResolvedValue({ ok: true, kind: 'converted', clientSlug: 'test-client', created: true });
    await mount();
    expect(container.textContent).toContain('Test Client');
    expect(container.textContent).toContain('1 health answer to check');
    await act(async () => button('Start assessment')?.click());
    expect(convert).toHaveBeenCalledWith('i1', undefined);
    expect(path).toBe('/dashboard/clients/test-client?resume=1');
  });

  it('asks the coach before using an existing client', async () => {
    convert.mockResolvedValueOnce({ ok: true, kind: 'choose', candidates: [{ clientSlug: 'test-client', clientName: 'Test Client' }] })
      .mockResolvedValueOnce({ ok: true, kind: 'converted', clientSlug: 'test-client', created: false });
    await mount();
    await act(async () => button('Start assessment')?.click());
    expect(document.body.textContent).toContain('Is this an existing client?');
    expect(path).toBe('/dashboard/clients');
    await act(async () => button('Use Test Client')?.click());
    expect(convert).toHaveBeenLastCalledWith('i1', { useClient: 'test-client' });
    expect(path).toBe('/dashboard/clients/test-client?resume=1');
  });

  it('explains a taken name inside the dialog', async () => {
    convert.mockResolvedValueOnce({ ok: true, kind: 'choose', candidates: [{ clientSlug: 'test-client', clientName: 'Test Client' }] })
      .mockRejectedValueOnce({ reason: 'name_taken' });
    await mount();
    await act(async () => button('Start assessment')?.click());
    await act(async () => button('Create new client')?.click());
    expect(convert).toHaveBeenLastCalledWith('i1', { createNew: true, clientName: 'Test Client' });
    expect(document.body.textContent).toContain('A client with this name already exists');
  });

  it('dismisses an intake', async () => {
    convert.mockResolvedValue({ ok: true, kind: 'dismissed' });
    await mount();
    await act(async () => button('Dismiss')?.click());
    expect(convert).toHaveBeenCalledWith('i1', { dismiss: true });
  });
});
