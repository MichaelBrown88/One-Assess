import { describe, expect, it } from 'vitest';
import { captureVideoFrame } from './captureVideoFrame';

describe('captureVideoFrame', () => {
  it('returns null when the video is not ready', () => {
    expect(captureVideoFrame(null)).toBeNull();
    expect(captureVideoFrame({ readyState: 0, videoWidth: 0, videoHeight: 0 } as HTMLVideoElement)).toBeNull();
  });
});
