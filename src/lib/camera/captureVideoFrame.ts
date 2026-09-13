/**
 * Grab a JPEG still from a live <video>. Prefer this over react-webcam
 * getScreenshot() on iPad — constrained screenshot sizes often return null.
 */
export function captureVideoFrame(
  video: HTMLVideoElement | null | undefined,
  quality = 0.9,
): string | null {
  if (!video || video.readyState < 2 || video.videoWidth < 2 || video.videoHeight < 2) {
    return null;
  }
  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', quality);
}
