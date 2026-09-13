const OCR_MAX_WIDTH = 1600;
const OCR_JPEG_QUALITY = 0.9;

/**
 * Downscale a body-comp photo for Gemini. Do not crop — studio shots of a
 * machine screen already fill the frame, and cropping the bottom 25% was
 * cutting the numbers the model needed.
 */
export async function downscaleBodyCompImage(imageSrc: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      try {
        if (img.width <= OCR_MAX_WIDTH) {
          resolve(imageSrc);
          return;
        }
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(imageSrc);
          return;
        }
        const scale = OCR_MAX_WIDTH / img.width;
        canvas.width = OCR_MAX_WIDTH;
        canvas.height = Math.max(1, Math.floor(img.height * scale));
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', OCR_JPEG_QUALITY));
      } catch {
        resolve(imageSrc);
      }
    };

    img.onerror = () => resolve(imageSrc);

    if (imageSrc.startsWith('data:') || imageSrc.startsWith('http')) {
      img.src = imageSrc;
    } else {
      img.src = `data:image/jpeg;base64,${imageSrc}`;
    }
  });
}
