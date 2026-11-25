import { describe, expect, it } from 'vitest';
import { COACH_RUNTIME_CACHING } from './runtimeCaching';

function intercepted(url: string): boolean {
  const parsed = new URL(url);
  return COACH_RUNTIME_CACHING.some((rule) =>
    rule.urlPattern instanceof RegExp ? rule.urlPattern.test(url) : rule.urlPattern({ url: parsed }),
  );
}

describe('coach service worker runtime caching', () => {
  it('does not intercept scripts or Firebase traffic', () => {
    expect(intercepted('https://one-assess.com/assets/main-Cd_MqS3A.js')).toBe(false);
    expect(intercepted('https://firestore.googleapis.com/google.firestore.v1.Firestore/Listen/channel?VER=8')).toBe(false);
    expect(intercepted('https://securetoken.googleapis.com/v1/token')).toBe(false);
    expect(intercepted('https://identitytoolkit.googleapis.com/v1/accounts:lookup')).toBe(false);
    expect(intercepted('https://us-central1-assessment-engine-8f633.cloudfunctions.net/publicApiV1')).toBe(false);
    expect(intercepted('https://storage.googleapis.com/assessment-engine-8f633.appspot.com/posture.jpg')).toBe(false);
  });

  it('still caches ordinary images', () => {
    expect(intercepted('https://one-assess.com/og-image.png')).toBe(true);
  });
});
