import { useEffect, useRef } from 'react';
import { useCurrentMountKey } from '../mount-context.js';
import { useScena } from '../ScenaProvider.js';

/**
 * Declares the pending work of the mount this renders in. `reason` returns
 * why closing now loses work, or null when nothing is lost. A close a person
 * starts (the tab's x, the card menu, Esc) then asks first. A close from code
 * does not.
 *
 * `reason` is read when a close is asked for, not when it renders, so it can
 * read the latest state through a closure.
 */
export function useCloseGuard(reason: () => string | null): void {
  const scena = useScena();
  const key = useCurrentMountKey();
  const latest = useRef(reason);
  latest.current = reason;

  useEffect(() => {
    if (key === null) return;
    const guard = scena.surfaces.guardClose(key, () => latest.current());
    return () => guard.dispose();
  }, [scena, key]);
}
