import { useEffect, useState } from 'react';

// Minimal URL-path subscription. Reads `location.pathname`, re-renders on
// browser back/forward AND on programmatic `navigate(path)` (we manually
// dispatch a popstate after pushState so subscribers wake up — pushState
// itself doesn't fire popstate).
//
// No react-router dep. Replace with one once route nesting / params /
// search-string matching matters; for boot-phase routing it doesn't.
export function useUrlPath(): string {
  const [path, setPath] = useState<string>(() =>
    typeof window === 'undefined' ? '/' : window.location.pathname,
  );
  useEffect(() => {
    const onChange = (): void => setPath(window.location.pathname);
    window.addEventListener('popstate', onChange);
    return () => window.removeEventListener('popstate', onChange);
  }, []);
  return path;
}

// Programmatic navigation. pushState then dispatch popstate so useUrlPath
// re-renders.
export function navigate(path: string): void {
  if (typeof window === 'undefined') return;
  window.history.pushState(null, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
}
