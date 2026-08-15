import type { ComponentDefinition } from '../../types/component-registry.js';

// Catalog registration for data components (dynamic import — no eager load).
export const CATALOG_DATA_MAP: ComponentDefinition[] = [
  { component: 'List', category: 'inline', renderer: { kind: 'react', load: () => import('./List.js').then((m) => ({ default: m.List })) } },
  { component: 'DataTable', category: 'inline', renderer: { kind: 'react', load: () => import('./DataTable.js').then((m) => ({ default: m.DataTable })) } },
  { component: 'Pagination', category: 'inline', renderer: { kind: 'react', load: () => import('./Pagination.js').then((m) => ({ default: m.Pagination })) } },
  { component: 'Filter', category: 'inline', renderer: { kind: 'react', load: () => import('./Filter.js').then((m) => ({ default: m.Filter })) } },
];
