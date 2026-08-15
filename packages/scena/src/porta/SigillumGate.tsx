import type { ReactNode } from 'react';
import { useStore } from '../react/hooks/useStore.js';
import { SIGILLUM_PATHS } from './sigillum.js';
import type { Session } from './provider.js';
import { hasScope } from './match.js';

// Silent permission gate. Renders children when the current session carries
// `permission` (or when `permission` is omitted, when any session exists).
// Otherwise renders `fallback` (default: nothing).
//
// Use this when an unauthorized user should simply NOT see a UI element
// (e.g., a "Delete" button hidden from non-admins). For an inline gate with
// a visible login prompt, use `<PortaLock>`. For an app-level wall, use
// `<Limen>`.
export interface SigillumProps {
  permission?: string;
  fallback?: ReactNode;
  child?: ReactNode;
  children?: ReactNode;
}

export function Sigillum({
  permission,
  fallback = null,
  child,
  children,
}: SigillumProps): ReactNode {
  const session = useStore<Session | null>(SIGILLUM_PATHS.session) ?? null;
  return hasScope(session, permission) ? (child ?? children) : fallback;
}
