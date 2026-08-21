import type { ComponentDefinition } from '../../sdk/component-registry.js';

// Catalog registration for display components (dynamic import — no eager load).
export const CATALOG_DISPLAY_MAP: ComponentDefinition[] = [
  { component: 'Card', category: 'inline', renderer: { kind: 'react', load: () => import('./Card.js').then((m) => ({ default: m.Card })) } },
  { component: 'Divider', category: 'inline', renderer: { kind: 'react', load: () => import('./Divider.js').then((m) => ({ default: m.Divider })) } },
  { component: 'Alert', category: 'inline', renderer: { kind: 'react', load: () => import('./Alert.js').then((m) => ({ default: m.Alert })) } },
  { component: 'StatusDot', category: 'inline', renderer: { kind: 'react', load: () => import('./StatusDot.js').then((m) => ({ default: m.StatusDot })) } },
  { component: 'Badge', category: 'inline', renderer: { kind: 'react', load: () => import('./Badge.js').then((m) => ({ default: m.Badge })) } },
  { component: 'Text', category: 'inline', renderer: { kind: 'react', load: () => import('./Text.js').then((m) => ({ default: m.Text })) } },
  { component: 'Image', category: 'inline', renderer: { kind: 'react', load: () => import('./Image.js').then((m) => ({ default: m.Image })) } },
  { component: 'Icon', category: 'inline', renderer: { kind: 'react', load: () => import('./Icon.js').then((m) => ({ default: m.Icon })) } },
  { component: 'DetailList', category: 'inline', renderer: { kind: 'react', load: () => import('./DetailList.js').then((m) => ({ default: m.DetailList })) } },
  { component: 'DetailHeader', category: 'inline', renderer: { kind: 'react', load: () => import('./DetailHeader.js').then((m) => ({ default: m.DetailHeader })) } },
];
