import type { ComponentDefinition } from '../../sdk/component-registry.js';

// Catalog registration for navigation components (dynamic import — no eager load).
export const CATALOG_NAVIGATION_MAP: ComponentDefinition[] = [
  { component: 'Tabs', category: 'page', renderer: { kind: 'react', load: () => import('./Tabs.js').then((m) => ({ default: m.Tabs })) } },
  { component: 'Link', category: 'inline', renderer: { kind: 'react', load: () => import('./Link.js').then((m) => ({ default: m.Link })) } },
];
