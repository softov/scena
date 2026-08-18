import type { ComponentDefinition } from '../../types/component-registry.js';
import { Button } from './Button.js';

// Catalog registration for control components (dynamic import — no eager load).
export const CATALOG_CONTROLS_MAP: ComponentDefinition[] = [
  { component: 'Button', category: 'inline', renderer: { kind: 'react', load: async () => ({ default: Button }) } },
  { component: 'TextField', category: 'inline', renderer: { kind: 'react', load: () => import('./TextField.js').then((m) => ({ default: m.TextField })) } },
  { component: 'CheckBox', category: 'inline', renderer: { kind: 'react', load: () => import('./CheckBox.js').then((m) => ({ default: m.CheckBox })) } },
  { component: 'ChoicePicker', category: 'inline', renderer: { kind: 'react', load: () => import('./ChoicePicker.js').then((m) => ({ default: m.ChoicePicker })) } },
  { component: 'Slider', category: 'inline', renderer: { kind: 'react', load: () => import('./Slider.js').then((m) => ({ default: m.Slider })) } },
  { component: 'DateTimeInput', category: 'inline', renderer: { kind: 'react', load: () => import('./DateTimeInput.js').then((m) => ({ default: m.DateTimeInput })) } },
  { component: 'LocaleToggle', category: 'inline', renderer: { kind: 'react', load: () => import('./LocaleToggle.js').then((m) => ({ default: m.LocaleToggle })) } },
];
