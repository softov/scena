import { translate } from '../../i18n/registry.js';
import { BindingPath } from '../../types/component-graph.js';
import { Label } from '../../types/label.js';
import { useStore } from './useStore.js';

const EMPTY_LABEL_PATH = '$/__label__/empty' as BindingPath;

export function useStoreLabel(value: Label | undefined, fallback = '', dataContext?: BindingPath): string {
  const path =
    value && typeof value === 'object' && 'path' in value
      ? (value.path as BindingPath)
      : EMPTY_LABEL_PATH;

  // Always call the hook (rules of hooks). For non-path labels it reads a dummy
  // path and the result is ignored below. dataContext resolves relative (`/…`)
  // title paths against the mount's record root.
  const stored = useStore<string | undefined>(path, dataContext);

  if (typeof value === 'string') {
    return value;
  }

  if (!value) {
    return fallback;
  }

  if ('path' in value) {
    return stored ?? fallback;
  }

  if ('t' in value) {
    return translate(value.t, fallback);
  }

  return fallback;
}