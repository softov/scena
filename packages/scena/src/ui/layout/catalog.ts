import type { ComponentDefinition } from '../../sdk/component-registry.js';

// Catalog registration for layout primitives. Dynamic import() so importing
// this file pulls nothing eager — components load on first render. Direct
// re-exports for React use live in ./index.ts; the lazy layout strategies are
// in ./register.ts.
export const CATALOG_LAYOUT_MAP: ComponentDefinition[] = [
  { component: 'Row', category: 'inline', renderer: { kind: 'react', load: () => import('./Row.js').then((m) => ({ default: m.Row })) } },
  { component: 'Column', category: 'inline', renderer: { kind: 'react', load: () => import('./Column.js').then((m) => ({ default: m.Column })) } },
  { component: 'Grid', category: 'inline', renderer: { kind: 'react', load: () => import('./Grid.js').then((m) => ({ default: m.Grid })) } },
  { component: 'Splitter', category: 'page', renderer: { kind: 'react', load: () => import('./Splitter.js').then((m) => ({ default: m.Splitter as unknown })) } },
];
