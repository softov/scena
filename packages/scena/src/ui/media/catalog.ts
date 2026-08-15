import type { ComponentDefinition } from '../../types/component-registry.js';

// Catalog registration for media components (dynamic import — no eager load).
export const CATALOG_MEDIA_MAP: ComponentDefinition[] = [
  { component: 'Video', category: 'inline', renderer: { kind: 'react', load: () => import('./Video.js').then((m) => ({ default: m.Video })) } },
  { component: 'Audio', category: 'inline', renderer: { kind: 'react', load: () => import('./Audio.js').then((m) => ({ default: m.Audio })) } },
];
