import { useEffect, useState } from 'react';
import type { ResolvedMount, SurfaceName } from '../../sdk/mount-surface.js';
import { useScena } from '../ScenaProvider.js';

export function useMounts(surface: SurfaceName): ResolvedMount[] {
  const scena = useScena();
  const [mounts, setMounts] = useState<ResolvedMount[]>(() => scena.surfaces.listAt(surface));

  useEffect(() => {
    const refresh = () => setMounts(scena.surfaces.listAt(surface));
    refresh();
    const subs = [
      scena.events.on('scena:mount:opened', refresh),
      scena.events.on('scena:mount:closed', refresh),
      scena.events.on('scena:mount:focused', refresh),
    ];
    return () => subs.forEach((s) => s.dispose());
  }, [scena, surface]);

  return mounts;
}
