import type { ComponentDefinition } from '../../sdk/component-registry.js';

// Catalog registration for overlay components (dynamic import — no eager load).
export const CATALOG_OVERLAY_MAP: ComponentDefinition[] = [
  { component: 'Modal', category: 'page', renderer: { kind: 'react', load: () => import('./Modal.js').then((m) => ({ default: m.Modal })) } },
];
