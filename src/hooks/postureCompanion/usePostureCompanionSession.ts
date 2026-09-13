import { useState, useEffect, useMemo, type Dispatch, type SetStateAction } from 'react';
import {
  createLiveSession,
  LIVE_SESSION_PLACEHOLDER_CLIENT_ID,
  type LiveSession,
} from '@/services/liveSessions';
import { generatePlaceholderWithGreenLines } from '@/lib/utils/postureOverlay';
import type { UserProfile } from '@/types/auth';
import { VIEWS } from './types';
import { useFormContext } from '@/contexts/FormContext';
import { generateClientSlug } from '@/services/clientProfiles';
import { isPersistableImageUrl } from '@/lib/assessment/prepareFormDataForPersistence';

export interface UsePostureCompanionSessionArgs {
  isOpen: boolean;
  profile: UserProfile | null | undefined;
}

export interface UsePostureCompanionSessionResult {
  session: LiveSession | null;
  setSession: Dispatch<SetStateAction<LiveSession | null>>;
  error: string | null;
  companionUrl: string;
  placeholderImages: Record<string, string>;
  hasAllImages: boolean;
  isComplete: boolean;
}

export function usePostureCompanionSession({
  isOpen,
  profile,
}: UsePostureCompanionSessionArgs): UsePostureCompanionSessionResult {
  const [session, setSession] = useState<LiveSession | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { formData } = useFormContext();
  const clientId =
    generateClientSlug(formData.fullName?.trim() || '') || LIVE_SESSION_PLACEHOLDER_CLIENT_ID;

  useEffect(() => {
    if (!isOpen) {
      setSession(null);
      setError(null);
      return;
    }

    let cancelled = false;
    const init = async () => {
      try {
        const newSession = await createLiveSession(
          clientId,
          profile?.organizationId,
          profile,
        );
        if (!cancelled) {
          setSession(newSession);
          setError(null);
        }
      } catch {
        if (!cancelled) setError('Connection failed. Please check your internet.');
      }
    };
    void init();
    return () => {
      cancelled = true;
    };
  }, [isOpen, profile, clientId]);

  const companionUrl = session
    ? `${window.location.origin}/companion/${session.id}?token=${session.companionToken}`
    : '';

  const placeholderImages = useMemo(() => {
    const placeholders: Record<string, string> = {};
    VIEWS.forEach((view) => {
      placeholders[view] = generatePlaceholderWithGreenLines(view);
    });
    return placeholders;
  }, []);

  const hasAllImages = VIEWS.every((v) => {
    if (!session) return false;
    const url =
      session[`postureImagesStorage_${v}`] ||
      session[`postureImagesFull_${v}`] ||
      session.postureImages[v];
    return isPersistableImageUrl(url);
  });
  const isComplete = VIEWS.every((v) => !!session?.analysis[v]);

  return {
    session,
    setSession,
    error,
    companionUrl,
    placeholderImages,
    hasAllImages,
    isComplete,
  };
}
