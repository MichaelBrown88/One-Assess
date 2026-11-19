import { describe, expect, it } from 'vitest';
import { generateApiKey, hashSecret, parseApiKey, secretMatches } from './keys';

describe('API keys', () => {
  it('round-trips a generated key through the Authorization header', () => {
    const key = generateApiKey();
    expect(key.plaintext).toMatch(/^oa_live_[A-Za-z0-9]{12}_[A-Za-z0-9_-]{43}$/);
    const parsed = parseApiKey(`Bearer ${key.plaintext}`);
    expect(parsed?.keyId).toBe(key.keyId);
    expect(secretMatches(parsed?.secret ?? '', key.secretHash)).toBe(true);
    expect(key.preview.endsWith(key.plaintext.slice(-4))).toBe(true);
    expect(key.preview).not.toContain(key.plaintext.slice(21, 40));
  });

  it('never stores the secret itself', () => {
    const key = generateApiKey();
    const secret = key.plaintext.split('_').slice(3).join('_');
    expect(key.secretHash).toBe(hashSecret(secret));
    expect(key.secretHash).not.toContain(secret);
  });

  it('makes unique keys', () => {
    const ids = new Set(Array.from({ length: 50 }, () => generateApiKey().keyId));
    expect(ids.size).toBe(50);
  });

  it.each([undefined, '', 'oa_live_x', 'Basic abc', 'Bearer oa_test_aaaaaaaaaaaa_' + 'b'.repeat(43), `Bearer oa_live_short_${'b'.repeat(43)}`])(
    'rejects malformed header %s', (header) => {
      expect(parseApiKey(header)).toBeNull();
    });

  it('rejects the wrong secret', () => {
    const key = generateApiKey();
    expect(secretMatches('x'.repeat(43), key.secretHash)).toBe(false);
    expect(secretMatches('x', 'not-hex')).toBe(false);
  });
});
