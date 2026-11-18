import { createContext, useContext } from 'react';
import type { UseOwnerConsoleResult } from '@/hooks/useOwnerConsole';

export const OwnerConsoleContext = createContext<UseOwnerConsoleResult | null>(null);

export function useOwnerConsoleContext(): UseOwnerConsoleResult {
  const value = useContext(OwnerConsoleContext);
  if (!value) {
    throw new Error('useOwnerConsoleContext must be used within OwnerConsoleLayout');
  }
  return value;
}
