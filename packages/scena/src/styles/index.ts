// Theme registry + class-builder helpers.
//
// A theme is a *family* (id + label) with `light` and `dark` variants.
// Each variant's source is either inline tokens or a CSS file URL.
//
// Apps switch via `applyTheme(root, themeId, mode)`, which writes
//   data-theme="<id>"        (family)
//   data-theme-mode="<mode>" (variant)
// onto the root so CSS like
//   [data-theme="vscode"][data-theme-mode="dark"] { … }
// can drive family-specific styling. Token-sourced themes additionally
// write `--…` custom properties directly onto the root.

export type ThemeMode = 'light' | 'dark';
export type ThemeSource =
  | { kind: 'tokens'; tokens: Record<string, string> }
  | { kind: 'css'; href: string };

export interface ThemeDefinition {
  id: string;
  label: string;
  variants: Partial<Record<ThemeMode, ThemeSource>>;
}

const themes = new Map<string, ThemeDefinition>();
const injectedHrefs = new Set<string>();
const appliedTokens = new WeakMap<HTMLElement, string[]>();

export function registerTheme(def: ThemeDefinition): void {
  themes.set(def.id, def);
}

export function unregisterTheme(id: string): void {
  themes.delete(id);
}

export function getTheme(id: string): ThemeDefinition | undefined {
  return themes.get(id);
}

export function listThemes(): ThemeDefinition[] {
  return [...themes.values()];
}

export function applyTheme(root: HTMLElement, themeId: string, mode: ThemeMode): void {
  root.setAttribute('data-theme', themeId);
  root.setAttribute('data-theme-mode', mode);

  const prior = appliedTokens.get(root);
  if (prior) {
    for (const prop of prior) root.style.removeProperty(prop);
    appliedTokens.delete(root);
  }

  const def = themes.get(themeId);
  if (!def) return;
  const source = def.variants[mode];
  if (!source) return;

  if (source.kind === 'css') {
    ensureCssLink(source.href);
    return;
  }

  const written: string[] = [];
  for (const [k, v] of Object.entries(source.tokens)) {
    const prop = k.startsWith('--') ? k : `--${k}`;
    root.style.setProperty(prop, v);
    written.push(prop);
  }
  appliedTokens.set(root, written);
}

function ensureCssLink(href: string): void {
  if (typeof document === 'undefined') return;
  if (injectedHrefs.has(href)) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = href;
  link.setAttribute('data-scena-theme', href);
  document.head.appendChild(link);
  injectedHrefs.add(href);
}

// Built-in `default` family. The CSS already ships in
// `./themes/light.css` and `./themes/dark.css` (bundled by the app entry),
// so the variant sources only need to be present for discovery — the
// real styling lives in those files keyed on
// [data-theme="default"][data-theme-mode="…"].
registerTheme({
  id: 'default',
  label: 'Default',
  variants: {
    light: { kind: 'tokens', tokens: {} },
    dark: { kind: 'tokens', tokens: {} },
  },
});

// ── Appearance helper ────────────────────────────────────────────────────

export const SIZE_NAMES = ['xs', 'sm', 'md', 'lg'];
export const SIZE_SET = new Set(SIZE_NAMES);
export type SizeName = (typeof SIZE_NAMES)[number];

export interface AppearanceProps {
  variant?: string;
  size?: SizeName;
  density?: 'compact' | 'comfortable' | 'spacious';
}

// Builds a class string from a base class + standard appearance props.
//   appearance('oo-btn', { variant: 'primary', size: 'sm' })
//     → 'oo-btn oo-btn--primary oo-btn--sm'
export function appearance(base: string, opts: AppearanceProps = {}): string {
  const classes: string[] = [base];
  if (opts.variant) classes.push(`${base}--${opts.variant}`);
  if (opts.size) classes.push(`${base}--${opts.size}`);
  if (opts.density) classes.push(`${base}--${opts.density}`);
  return classes.join(' ');
}

export function resolveVariableSize(name: string): string {
  if (name.startsWith('--')) return name;
  if (SIZE_SET.has(name)) return `--oo-spacing-${name}`;
  return `--${name}`;
}

export function resolveVariableFontSize(name: string): string {
  if (name.startsWith('--')) return name;
  if (SIZE_SET.has(name)) return `--oo-font-size-${name}`;
  return `--${name}`;
}

// ── Theme as store state ─────────────────────────────────────────────────
// Re-exported here so an app has one import for everything theme-related.
export {
  THEME_ID_PATH,
  THEME_MODE_PATH,
  resolveThemeMode,
  registerThemeController,
} from './controller.js';
export type { ThemeModeChoice, ThemeControllerOptions } from './controller.js';
