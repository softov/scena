import type { BindingPath } from '../../types/component-graph.js';
import type { SurfaceName } from '../../types/mount-surface.js';
import type { SurfacePresentation } from '../../types/layout.js';
import type { ModusClass } from '../../core/backends/modus-backend.js';
import {
  resolveSurfacePresentation,
  type PresentationPolicy,
} from '../../core/surface-presentation.js';
import { useStore } from './useStore.js';

// Reads `$/modus/class` and maps it to how this surface should occupy space.
//
// `policy` is the app's, not scena's — see surface-presentation.ts. Omitted, or
// with the modus backend unregistered, every surface stays `docked`, which is
// exactly the behavior before presentation existed.
//
// The backend is registered by the app:
//   { scope: 'modus', create: () => createModusBackend() }
export function useSurfacePresentation(
  surface: SurfaceName,
  policy?: PresentationPolicy,
): SurfacePresentation {
  const modus = useStore<ModusClass>('$/modus/class' as BindingPath);
  if (!modus) return 'docked';
  return resolveSurfacePresentation(surface, modus, policy);
}
