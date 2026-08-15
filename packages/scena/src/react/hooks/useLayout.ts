import { useSyncExternalStore } from 'react';
import type { ScenaLayout } from '../../types/layout.js';
import { useScena } from '../ScenaProvider.js';

const EMPTY: ScenaLayout = { surfaces: {} };

export function useLayout(): ScenaLayout {
  const scena = useScena();
  return useSyncExternalStore(
    (onChange) => {
      const sub = scena.layout.subscribe(() => onChange());
      return () => sub.dispose();
    },
    () => scena.layout.get(),
    () => EMPTY,
  );
}
