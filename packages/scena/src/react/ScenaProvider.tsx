import { createContext, useContext, type ReactNode } from 'react';
import type { Scena } from '../types/scena.js';

const ScenaContext = createContext<Scena | null>(null);

export interface ScenaProviderProps {
  scena: Scena;
  children: ReactNode;
}

export function ScenaProvider({ scena, children }: ScenaProviderProps) {
  return <ScenaContext.Provider value={scena}>{children}</ScenaContext.Provider>;
}

export function useScena(): Scena {
  const ctx = useContext(ScenaContext);
  if (!ctx) {
    throw new Error('useScena must be used inside <ScenaProvider> or <Scena>');
  }
  return ctx;
}
