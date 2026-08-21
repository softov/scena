// Named color palette
// Tokens themselves live in styles/theme.css as raw RGB triplets
// Callers can wrap with `rgb(var(--oo-color-X))` and
// get alpha control via `rgb(var(...) / 0.6)`.
export const NAMED_COLORS = [
  'shell',
  'muted',
  'amber',
  'blue',
  'red',
  'green',
  'yellow',
  'purple',
  'orange',
  'pink',
  'teal',
  'cyan',
  'white',
  'black',
  'gray',
  'indigo',
  'violet',
  'fuchsia',
  'rose',
  'lime',
  'emerald',
  'sky',
  'slate',
  'zinc',
  'neutral',
  'stone',
  'success',
  'danger',
  'warning',
] as const;

export const SETTED_COLORS = new Set(NAMED_COLORS);

export type ScenaColor = (typeof NAMED_COLORS)[number];

// Three forms accepted at use sites:
//   'violet'                       — named ScenaColor → resolves to var(--oo-color-violet)
//   '37 99 235'                    — raw RGB triplet, used as `rgb(<triplet>)`
//   'var(--my-token)'              — pre-built CSS var reference, passed through
//   '37 99 235 / 0.6'              — triplet with alpha, also works
//
// The `& {}` intersection keeps autocomplete for ScenaColor names while
// accepting any string at runtime.
export type ResourceColor = ScenaColor | (string & {});

export function resolveColorVar(c: ResourceColor): string {
  if (SETTED_COLORS.has(c as ScenaColor)) return `var(--oo-rgb-${c})`;
  return c;
}

export function resolveColorRgb(c?: ResourceColor): string | undefined {
  if (!c) return undefined;
  if (SETTED_COLORS.has(c as ScenaColor)) return `rgb(var(--oo-rgb-${c}))`;
  return c.startsWith('var(') || c.includes('rgb') || c.startsWith('#') ? c : `rgb(${c})`;
}

export function resolveColorAlpha(c?: string, alpha?: number): string {
  if (!c) return alpha ? `rgba(128, 128, 128, ${alpha})` : 'rgb(128 128 128)';
  if (SETTED_COLORS.has(c as ScenaColor))
    return alpha ? `rgb(var(--oo-rgb-${c}) / ${alpha})` : `rgb(var(--oo-rgb-${c}))`;
  return c.startsWith('var(') || c.includes('rgb') || c.startsWith('#')
    ? c
    : alpha
      ? `rgb(${c} / ${alpha})`
      : `rgb(${c})`;
}
