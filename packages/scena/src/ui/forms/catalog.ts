import type { ComponentDefinition } from '../../types/component-registry.js';

// Catalog registration for form components (dynamic import — no eager load).
// FieldLabel / FieldError / FieldHint are internal parts of Field, not catalog

// components — see ./index.ts.
export const CATALOG_FORMS_MAP: ComponentDefinition[] = [
  { component: 'Form', category: 'page', renderer: { kind: 'react', load: () => import('./Form.js').then((m) => ({ default: m.Form })) } },
  { component: 'Field', category: 'inline', renderer: { kind: 'react', load: () => import('./Field.js').then((m) => ({ default: m.Field })) } },
  { component: 'FieldGroup', category: 'inline', renderer: { kind: 'react', load: () => import('./FieldGroup.js').then((m) => ({ default: m.FieldGroup })) } },
  { component: 'FormSection', category: 'inline', renderer: { kind: 'react', load: () => import('./FormSection.js').then((m) => ({ default: m.FormSection })) } },
  { component: 'FormActions', category: 'inline', renderer: { kind: 'react', load: () => import('./FormActions.js').then((m) => ({ default: m.FormActions })) } },
  { component: 'SchemaForm', category: 'page', renderer: { kind: 'react', load: () => import('./SchemaForm.js').then((m) => ({ default: m.SchemaForm })) } },
];
