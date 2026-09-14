import { describe, expect, it } from 'vitest';
import { createEmptyAssessmentForm } from '@/contexts/FormContext';
import {
  isPersistableImageUrl,
  pickPersistableImageMap,
  prepareFormDataForPersistence,
} from './prepareFormDataForPersistence';

describe('prepareFormDataForPersistence', () => {
  it('keeps https storage URLs and drops data-URL photos', () => {
    const form = {
      ...createEmptyAssessmentForm(),
      fullName: 'Ibrahim',
      postureImages: {
        front: `data:image/jpeg;base64,${'A'.repeat(80)}`,
        back: 'https://firebasestorage.googleapis.com/v0/b/app/o/back.jpg',
      },
      postureImagesStorage: {
        'side-left': 'https://firebasestorage.googleapis.com/v0/b/app/o/left.jpg',
      },
    };

    const persisted = prepareFormDataForPersistence(form);

    expect(persisted.postureImages).toEqual({});
    expect(persisted.postureImagesStorage).toEqual({
      back: 'https://firebasestorage.googleapis.com/v0/b/app/o/back.jpg',
      'side-left': 'https://firebasestorage.googleapis.com/v0/b/app/o/left.jpg',
    });
    expect(persisted.fullName).toBe('Ibrahim');
  });

  it('drops the sanitiser placeholder so reports do not think a photo exists', () => {
    expect(
      pickPersistableImageMap({
        front: '(base64_removed_for_storage_limit)',
      }),
    ).toEqual({});
  });

  it('rejects data URLs and empty values', () => {
    expect(isPersistableImageUrl('data:image/jpeg;base64,abc')).toBe(false);
    expect(isPersistableImageUrl('')).toBe(false);
    expect(isPersistableImageUrl('https://example.com/a.jpg')).toBe(true);
  });

  it('drops raw MediaPipe landmarks from saved analysis', () => {
    const form = {
      ...createEmptyAssessmentForm(),
      postureAiResults: {
        front: {
          landmarks: {
            shoulder_y_percent: 25,
            overlay: { ear: { x: 50, y: 18 } },
            raw: [{ x: 0.1, y: 0.2, z: 0.3, visibility: 1 }],
          },
        },
      },
    };

    const persisted = prepareFormDataForPersistence(
      // Stub only needs landmarks.raw — other analysis fields are not read.
      form as unknown as ReturnType<typeof createEmptyAssessmentForm>,
    );
    expect(persisted.postureAiResults?.front?.landmarks?.shoulder_y_percent).toBe(25);
    expect(persisted.postureAiResults?.front?.landmarks?.raw).toBeUndefined();
    expect(persisted.postureAiResults?.front?.landmarks?.overlay).toEqual({
      ear: { x: 50, y: 18 },
    });
  });
});
