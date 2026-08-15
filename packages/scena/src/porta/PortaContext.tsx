import { createContext, useContext, type ReactNode } from 'react';
import { useStore } from '../react/hooks/useStore.js';
import { SIGILLUM_PATHS } from './sigillum.js';
import type { Porta } from './register.js';
import type { Session } from './provider.js';

const PortaContext = createContext<Porta | null>(null);

export interface PortaProviderProps {
  porta: Porta;
  children: ReactNode;
}

// Wrap the app once (inside <ScenaProvider>). `LoginForm` and other porta
// blocks read the registered providers + their UI metadata from here.
export function PortaProvider({ porta, children }: PortaProviderProps): ReactNode {
  return <PortaContext.Provider value={porta}>{children}</PortaContext.Provider>;
}

export function usePorta(): Porta {
  const ctx = useContext(PortaContext);
  if (!ctx) {
    throw new Error(
      'usePorta(): no <PortaProvider> in scope. Wrap your app with <PortaProvider porta={createPorta(scena, …)}>.',
    );
  }
  return ctx;
}

export function useSession(): Session | null {
  return useStore<Session | null>(SIGILLUM_PATHS.session) ?? null;
}
