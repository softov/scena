import { lazy, Suspense, type ReactNode } from 'react';
import { useStore } from '../react/hooks/useStore.js';
import { SIGILLUM_PATHS } from './sigillum.js';
import type { Session } from './provider.js';
// import { LoginForm } from './LoginForm.js';
const LoginForm = lazy(() => import('../ui/forms/LoginForm.js').then(module => ({ default: module.LoginForm })));
import { hasScope } from './match.js';
import './Limen.css';

// Full-page wall. When the current session lacks `permission`, replaces the
// whole subtree with a centered `<LoginForm>` (or `fallback`), surrounded
// by optional top / bottom / left / right slots. When the permission is
// granted, renders `children` unchanged.
//
// Typical use: wrap the app shell.
//
//   <Limen
//     permission="session.read"
//     top={<BrandBar />}
//     bottom={<Copyright />}
//     title="Welcome back"
//     subtitle="Sign in to continue."
//   >
//     <CustomShell />
//   </Limen>
//
// For a small inline gate, use `<PortaLock>`. For a silent hide, use
// `<Sigillum>`.
export interface LimenProps {
  permission?: string;
  /** Replaces the default <LoginForm /> in the center. */
  fallback?: ReactNode;
  title?: ReactNode;
  subtitle?: ReactNode;
  top?: ReactNode;
  bottom?: ReactNode;
  left?: ReactNode;
  right?: ReactNode;
  child?: ReactNode;
  children?: ReactNode;
}

export function Limen({
  permission,
  fallback,
  title = 'Welcome',
  subtitle,
  top,
  bottom,
  left,
  right,
  child,
  children,
}: LimenProps): ReactNode {
  const session = useStore<Session | null>(SIGILLUM_PATHS.session) ?? null;
  if (hasScope(session, permission)) return child ?? children;

  return (
    <div className="porta-limen">
      {top    ? <div className="porta-limen__top">{top}</div>       : null}
      {left   ? <div className="porta-limen__left">{left}</div>     : null}
      <div className="porta-limen__center">
        <div className="porta-limen__panel">
          <div className="porta-limen__title">{title}</div>
          {subtitle ? <div className="porta-limen__subtitle">{subtitle}</div> : null}
          {fallback ?? <Suspense fallback={<div>Loading...</div>}><LoginForm /></Suspense>}
        </div>
      </div>
      {right  ? <div className="porta-limen__right">{right}</div>   : null}
      {bottom ? <div className="porta-limen__bottom">{bottom}</div> : null}
    </div>
  );
}

export default Limen;
