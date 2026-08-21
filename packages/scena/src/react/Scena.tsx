import { lazy, type ReactNode, Suspense, useEffect, useRef } from 'react';
import type { Scena as ScenaInstance } from '../sdk/scena.js';
import type { CreateScenaOptions } from '../sdk/scena.js';
import { createScena } from '../core/scena.js';
import { ScenaProvider } from './ScenaProvider.js';
// import { DefaultShell } from './DefaultShell.js';
const DefaultShell = lazy(() => import('./DefaultShell.js').then(module => ({ default: module.DefaultShell })));

export interface ScenaComponentProps {
  options?: CreateScenaOptions;
  // Called exactly once, immediately after the Scena instance is created.
  // Register components, commands, mounts, etc. here.
  onRender?: (scena: ScenaInstance) => void;
  // Override the default shell. If omitted, <DefaultShell /> is rendered.
  children?: ReactNode;
}

export function Scena({ options, onRender, children }: ScenaComponentProps) {
  const scenaRef = useRef<ScenaInstance | null>(null);

  if (!scenaRef.current) {
    scenaRef.current = createScena(options);
    onRender?.(scenaRef.current);
  }

  useEffect(() => {
    return () => {
      scenaRef.current?.dispose();
      scenaRef.current = null;
    };
  }, []);

  return (
    <ScenaProvider scena={scenaRef.current}>
      {children ?? (
        <Suspense fallback={<div>Loading...</div>} >
          <DefaultShell />
        </Suspense>
      )}
    </ScenaProvider>
  );
}
