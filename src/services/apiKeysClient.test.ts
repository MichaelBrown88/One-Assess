import { describe, expect, it, vi } from 'vitest';
vi.mock('@/services/firebase', () => ({ getDb: () => ({}), getFirebaseFunctions: () => ({}) }));
import { toApiKeySummary } from './apiKeysClient';

describe('toApiKeySummary', () => {
  it('marks revoked keys and reads timestamps', () => {
    expect(toApiKeySummary('k', { name: 'n', preview: 'p', createdAt: { toMillis: () => 5 }, revokedAt: { toMillis: () => 1 } }))
      .toEqual({ keyId: 'k', name: 'n', preview: 'p', createdAtMs: 5, lastUsedAtMs: null, revoked: true });
    expect(toApiKeySummary('k', { revokedAt: null })).toMatchObject({ name: 'API key', revoked: false });
  });
});
