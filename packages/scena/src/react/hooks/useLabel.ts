import { useStore } from './useStore.js';
import { useI18n } from './useI18n.js';
import { translate } from '../../i18n/registry.js';
import type { Label } from '../../types/label.js';
import type { BindingPath } from '../../types/component-graph.js';

// Resolve a Label (string | { path } | { t }) reactively: `{ path }` follows the
// store, `{ t }` follows the locale, a string is returned as-is.
export function useLabel(label?: Label): string {
  const path = label && typeof label === 'object' && 'path' in label ? label.path : undefined;
  const bound = useStore<unknown>(path as BindingPath | undefined);
  useI18n(); // subscribe so `{ t }` re-resolves on locale switch
  if (label == null) return '';
  if (typeof label === 'string') return label;
  if ('t' in label) return translate(label.t);
  if ('path' in label) return bound == null ? '' : String(bound);
  return '';
}
