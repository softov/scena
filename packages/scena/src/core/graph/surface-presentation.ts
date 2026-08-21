import type { SurfaceName } from '../../sdk/mount-surface.js';
import type { SurfacePresentation } from '../../sdk/layout.js';
import type { ModusClass } from '../store/backends/modus-backend.js';

// Maps a `$/modus` size class to how each surface occupies space. A shell reads
// this at render time and never writes it back — see SurfacePresentation in
// types/layout.ts for why it must not persist.
//
// The policy itself is APPLICATION state and deliberately does not ship here.
// Whether a right sidebar floats before a left one is a claim about a specific
// app's information architecture — in one product the right sidebar is a
// throwaway inspector, in another it is the workspace. scena owns the
// mechanism (the four presentations, the resolver, the CSS, the `presentation`
// prop); the app owns the opinion.
//
// With no policy every surface is `docked`, which is exactly the behavior
// before presentation existed. A shell can therefore adopt the hook first and
// introduce policy afterwards without a flag day.
export type PresentationPolicy = Partial<
  Record<SurfaceName, Partial<Record<ModusClass, SurfacePresentation>>>
>;

export function resolveSurfacePresentation(
  surface: SurfaceName,
  modus: ModusClass,
  policy: PresentationPolicy = {},
): SurfacePresentation {
  return policy[surface]?.[modus] ?? 'docked';
}

// True when a presentation takes the surface out of the flex flow. Shells use
// this to decide whether to render a splitter at all — a floating surface has
// nothing left to resize against — and whether a scrim is needed.
//
// `bar` is excluded on purpose: it is pinned to an edge but still occupies it,
// so a shell keeps reserving space for it and draws no scrim.
export function isOverlaid(presentation: SurfacePresentation): boolean {
  return presentation === 'floating' || presentation === 'sheet';
}
