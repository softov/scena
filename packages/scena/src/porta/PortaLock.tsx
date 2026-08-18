import type { ReactNode } from 'react';
import { lazy, Suspense } from 'react';
import { useStore } from '../react/hooks/useStore.js';
import { SIGILLUM_PATHS } from './sigillum.js';
import type { Session } from './provider.js';
import { hasScope } from './match.js';
import './PortaLock.css';

// Inline lock. Wraps a region of the tree; when the current session lacks
// `permission`, renders `fallback` (defaults to <LoginForm />) inside a
// bordered card with a title. Use this when you want the user to log in
// from *within* a page (e.g., a settings tab that requires elevated
// permissions).
//
// For an app-level wall (centered login replacing the whole shell) use
// `<Limen>`. For a silent hide (no UI shown when blocked) use `<Sigillum>`.
export interface PortaLockProps {
  permission?: string;
  fallback?: ReactNode;
  title?: string;
  child?: ReactNode;
  children?: ReactNode;
}

const LoginForm = lazy(() =>
  import('../ui/forms/LoginForm.js').then((module) => ({
    default: module.LoginForm,
  }))
);

export function PortaLock({
  permission,
  fallback,
  title,
  child,
  children,
}: PortaLockProps): ReactNode {
  const session = useStore<Session | null>(SIGILLUM_PATHS.session) ?? null;
  const ok = hasScope(session, permission);
  if (ok) return child ?? children;
  return (
    <div className="porta-locked">
      <span className="porta-locked__title">
        {title ?? (permission ? `Sign in required (${permission})` : 'Sign in required')}
      </span>
      {fallback ?? (
        <Suspense fallback={null}>
          <LoginForm />
        </Suspense>
      )}
    </div>
  );
}

export default PortaLock;