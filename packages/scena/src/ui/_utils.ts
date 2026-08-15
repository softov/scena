import type { CSSProperties } from 'react';
import { resolveLabel } from '../core/label.js';
import type { Label } from '../types/label.js';
import { translate } from '../i18n/registry.js';

// Resolve a Label (string | { t }) to a plain string for non-reactive contexts.
// `{ path }` titles are resolved reactively by the layout headers via
// MountTitle / useMountTitle (which descend + subscribe against the mount's
// dataContext); this only covers the literal / `{ t }` cases.
export function labelText(label?: Label): string {
  return resolveLabel(label, { get: () => undefined, translate });
}

// Shared style helpers for the basic catalog. Mirrors a2ui's
// renderers/react/src/v0_9/catalog/basic/utils.ts so spec-style enums and
// weight handling are one implementation, not one per component.

// All a2ui v0.10 justify values (used by Row + Column). Includes scena legacy
// kebab-case aliases (`space-between`, `space-around`) for in-flight callers.
export type StyleJustify =
  | 'start'
  | 'center'
  | 'end'
  | 'spaceAround'
  | 'spaceBetween'
  | 'spaceEvenly'
  | 'stretch'
  // scena legacy aliases (deprecated):
  | 'space-around'
  | 'space-between';

// All a2ui v0.10 align values (used by Row + Column + List).
export type StyleAlign = 'start' | 'center' | 'end' | 'stretch';

export function mapJustify(
  j?: StyleJustify,
  def?: CSSProperties['justifyContent'],
): CSSProperties['justifyContent'] {
  switch (j) {
    case 'center':
      return 'center';
    case 'end':
      return 'flex-end';
    case 'spaceAround':
    case 'space-around':
      return 'space-around';
    case 'spaceBetween':
    case 'space-between':
      return 'space-between';
    case 'spaceEvenly':
      return 'space-evenly';
    case 'stretch':
      return 'stretch';
    case 'start':
      return 'flex-start';
    default:
      return def ?? 'flex-start';
  }
}

export function mapAlign(
  a?: StyleAlign,
  def?: CSSProperties['alignItems'],
): CSSProperties['alignItems'] {
  switch (a) {
    case 'start':
      return 'flex-start';
    case 'center':
      return 'center';
    case 'end':
      return 'flex-end';
    case 'stretch':
      return 'stretch';
    default:
      return def;
  }
}

// a2ui CatalogComponentCommon.weight → CSS flex-grow with min-* guards so a
// weighted child can shrink below its intrinsic content. Returns {} when
// weight is unset so callers can spread unconditionally.
export function weightStyle(weight?: number): CSSProperties {
  if (typeof weight !== 'number') return {};
  return { flex: `${weight}`, minWidth: 0, minHeight: 0 };
}
