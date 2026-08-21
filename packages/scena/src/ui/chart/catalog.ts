import type { ComponentDefinition } from '../../sdk/component-registry.js';

// Catalog registration for chart components (dynamic import — no eager load).
export const CATALOG_CHART_MAP: ComponentDefinition[] = [
  { component: 'BarChart', category: 'inline', renderer: { kind: 'react', load: () => import('./BarChart.js').then((m) => ({ default: m.BarChart })) } },
  { component: 'LineChart', category: 'inline', renderer: { kind: 'react', load: () => import('./LineChart.js').then((m) => ({ default: m.LineChart })) } },
  { component: 'Sparkline', category: 'inline', renderer: { kind: 'react', load: () => import('./LineChart.js').then((m) => ({ default: m.Sparkline })) } },
  { component: 'Donut', category: 'inline', renderer: { kind: 'react', load: () => import('./Donut.js').then((m) => ({ default: m.Donut })) } },
];
