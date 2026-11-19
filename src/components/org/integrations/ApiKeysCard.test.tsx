import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({ list: vi.fn(), create: vi.fn(), revoke: vi.fn() }));
vi.mock('@/services/apiKeysClient', () => ({ listApiKeys: api.list, createApiKey: api.create, revokeApiKey: api.revoke }));
vi.mock('@/services/intakeLinkClient', () => ({ intakeFailureReason: () => 'x' }));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));

import { ApiKeysCard } from './ApiKeysCard';

let container: HTMLDivElement;
let root: ReturnType<typeof createRoot>;
const key = { keyId: 'AAAAAAAAAAAA', name: 'Booking system', preview: 'oa_live_AAAAAAAAAAAA_…wxyz', createdAtMs: 1, lastUsedAtMs: null, revoked: false };
beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  Object.values(api).forEach((f) => f.mockReset());
  container = document.createElement('div');
  root = createRoot(container);
});
afterEach(async () => { await act(async () => root.unmount()); vi.unstubAllGlobals(); });
const mount = async () => { await act(async () => root.render(<ApiKeysCard organizationId="org-test" />)); await act(async () => { await Promise.resolve(); }); };
const button = (label: string) => Array.from(container.querySelectorAll('button')).find((b) => b.textContent?.includes(label));

describe('ApiKeysCard', () => {
  it('lists keys by preview only', async () => {
    api.list.mockResolvedValue([key]);
    await mount();
    expect(container.textContent).toContain('Booking system');
    expect(container.textContent).toContain('oa_live_AAAAAAAAAAAA_…wxyz');
    expect(container.textContent).toContain('last used never');
  });

  it('shows a new key once', async () => {
    api.list.mockResolvedValue([]);
    api.create.mockResolvedValue({ keyId: 'BBBBBBBBBBBB', apiKey: 'oa_live_BBBBBBBBBBBB_secret' });
    await mount();
    const input = container.querySelector('input') as HTMLInputElement;
    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
      setter?.call(input, 'Booking system');
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await act(async () => (container.querySelector('form') as HTMLFormElement).requestSubmit());
    expect(api.create).toHaveBeenCalledWith('Booking system');
    expect(container.textContent).toContain("won't be shown again");
    expect(container.textContent).toContain('oa_live_BBBBBBBBBBBB_secret');
    await act(async () => button('Done')?.click());
    expect(container.textContent).not.toContain('oa_live_BBBBBBBBBBBB_secret');
  });

  it('revokes after confirmation', async () => {
    api.list.mockResolvedValue([key]);
    vi.stubGlobal('confirm', () => true);
    await mount();
    await act(async () => button('Revoke')?.click());
    expect(api.revoke).toHaveBeenCalledWith('AAAAAAAAAAAA');
  });
});

