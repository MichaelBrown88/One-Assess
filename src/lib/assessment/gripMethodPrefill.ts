import { STORAGE_KEYS } from '@/constants/storageKeys';

export type StoredGripMethod = 'deadhang' | 'pinch';

export function readStoredGripMethod(): StoredGripMethod | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.LAST_GRIP_METHOD);
    return raw === 'deadhang' || raw === 'pinch' ? raw : null;
  } catch {
    return null;
  }
}

/** Skip the method picker when a method is already chosen and a result field follows. */
export function shouldSkipGripMethodStep(
  fieldId: string,
  gripTestMethod: string | undefined,
  isLastField: boolean,
): boolean {
  if (fieldId !== 'gripTestMethod' || isLastField) return false;
  return gripTestMethod === 'deadhang' || gripTestMethod === 'pinch';
}
