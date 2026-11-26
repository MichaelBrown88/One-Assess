import { afterEach, describe, expect, it, vi } from 'vitest';
import { appReloadUrl, isChunkLoadError, reloadApp } from './chunkLoadRecovery';

afterEach(() => vi.unstubAllGlobals());

describe('app file load recovery', () => {
  it.each([
    'Failed to fetch dynamically imported module: https://example.test/assets/Index-old.js',
    'error loading dynamically imported module: https://example.test/assets/Index-old.js',
    'Importing a module script failed.',
    'Loading chunk 12 failed.',
    'Unable to preload CSS for /assets/Index-old.css',
  ])('recognises a browser file-load failure: %s', (message) => {
    expect(isChunkLoadError(new TypeError(message))).toBe(true);
  });

  it.each([null, undefined, {}, new Error('Permission denied'), new TypeError('Cannot read properties of undefined')])(
    'does not turn an unrelated error into a reload', (error) => {
      expect(isChunkLoadError(error)).toBe(false);
    },
  );

  it('preserves the client deep link, resume flag and hash when requesting the current app', () => {
    const url = new URL(appReloadUrl('https://example.test/dashboard/clients/alex-example?resume=1&tab=x#details', 123));
    expect(url.pathname).toBe('/dashboard/clients/alex-example');
    expect(url.searchParams.get('resume')).toBe('1');
    expect(url.searchParams.get('tab')).toBe('x');
    expect(url.searchParams.get('appUpdate')).toBe('123');
    expect(url.hash).toBe('#details');
  });

  it('replaces the current page without touching assessment storage', () => {
    const replace = vi.fn();
    const session = { clear: vi.fn(), removeItem: vi.fn(), setItem: vi.fn() };
    vi.stubGlobal('window', {
      location: { href: 'https://example.test/assessment?appUpdate=old', replace },
      sessionStorage: session,
    });
    reloadApp();
    expect(replace).toHaveBeenCalledOnce();
    const url = new URL(replace.mock.calls[0][0]);
    expect(url.pathname).toBe('/assessment');
    expect(url.searchParams.getAll('appUpdate')).toHaveLength(1);
    expect(url.searchParams.get('appUpdate')).not.toBe('old');
    expect(session.clear).not.toHaveBeenCalled();
    expect(session.removeItem).not.toHaveBeenCalled();
    expect(session.setItem).not.toHaveBeenCalled();
  });
});
