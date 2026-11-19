import { describe, expect, it } from 'vitest';
import { MAX_SKEW_MS, signHandoff, verifyHandoffSignature } from './signature';

const secret = 'test-secret';
const nonce = 'abcdefghijklmnop';
const body = '{"version":1}';
const now = 1_800_000_000_000;
const timestamp = String(now);

describe('signHandoff', () => {
  it('matches the shared vector used by the OFS signer', () => {
    // Same vector is asserted in OFS src/lib/one-assess/handoff-signature.test.ts.
    expect(signHandoff('s', '1', 'n'.repeat(16), '{}')).toBe(
      '2367697317254996775367aa2f246e0a0214b63a8bbc5a9f6f4143c02f7109b1',
    );
  });
});

describe('verifyHandoffSignature', () => {
  const signature = signHandoff(secret, timestamp, nonce, body);
  const base = { secret, timestamp, nonce, signature, body, nowMs: now };

  it('accepts a fresh, correctly signed request', () => {
    expect(verifyHandoffSignature(base)).toBe('ok');
  });
  it('rejects a tampered body', () => {
    expect(verifyHandoffSignature({ ...base, body: '{"version":2}' })).toBe('bad');
  });
  it('rejects the wrong secret', () => {
    expect(verifyHandoffSignature({ ...base, secret: 'other' })).toBe('bad');
  });
  it('rejects requests older than the allowed skew', () => {
    expect(verifyHandoffSignature({ ...base, nowMs: now + MAX_SKEW_MS + 1 })).toBe('stale');
  });
  it('reports missing headers and an unset secret', () => {
    expect(verifyHandoffSignature({ ...base, signature: undefined })).toBe('missing');
    expect(verifyHandoffSignature({ ...base, secret: '' })).toBe('missing');
  });
  it('rejects malformed signatures and nonces without throwing', () => {
    expect(verifyHandoffSignature({ ...base, signature: 'not-hex' })).toBe('bad');
    expect(verifyHandoffSignature({ ...base, nonce: 'short' })).toBe('bad');
  });
});
