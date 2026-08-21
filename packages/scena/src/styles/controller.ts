import type { BindingPath } from '../sdk/component-graph.js';
import type { Disposable } from '../sdk/disposable.js';
import type { Scena } from '../sdk/scena.js';
import { combineDisposables } from '../sdk/disposable.js';
import { applyTheme, type ThemeMode } from './index.js';

// The theme, as store state.
//
// A theme has two independent axes — the family (`default`, `solarized`, …)
// and the mode (light / dark / follow the OS) — and an app typically has more
// than one control over them: a picker in the title bar, a toggle beside it, a
// select in settings. Keeping both axes in the store is what lets those stay in
// agreement without talking to each other, and it is why `applyTheme` and the
// `localStorage` write happen in exactly one subscriber rather than in whoever
// was clicked.
//
// scena imports nothing here at runtime: `Scena` is a type, so `styles/`
// remains a leaf. That matters because an app entry imports this module before
// React renders, to avoid a flash of the wrong theme.
export const THEME_ID_PATH = '$/ui/theme/id' as BindingPath;
export const THEME_MODE_PATH = '$/ui/theme/mode' as BindingPath;

// `system` is a real choice, not the absence of one: an app that resolves the
// OS preference once at boot stops following it when the user changes it, and
// there is no way back to that behaviour from a stored 'light' | 'dark'.
export type ThemeModeChoice = ThemeMode | 'system';

export interface ThemeControllerOptions {
  // localStorage keys. Namespace them per app so two scena apps on the same
  // origin do not fight over one preference.
  idKey?: string;
  modeKey?: string;
  // Used when nothing is stored and the document carries no `data-theme`.
  defaultThemeId?: string;
  defaultMode?: ThemeModeChoice;
  // The element the attributes and token overrides are written to.
  root?: HTMLElement;
  // Set false to keep the choice for the session only.
  persist?: boolean;
}

function isThemeChoice(v: unknown): v is ThemeModeChoice {
  return v === 'light' || v === 'dark' || v === 'system';
}

// Resolves `system` against the OS preference. Exported because a shell that
// needs the *effective* mode (to pick an asset, say) should not re-derive it.
export function resolveThemeMode(choice: ThemeModeChoice): ThemeMode {
  if (choice !== 'system') return choice;
  if (typeof window === 'undefined' || !window.matchMedia) return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/**
 * Wires the two theme paths to the document, and keeps them there.
 *
 * Seeds the store from storage (falling back to whatever the entry already put
 * on `<html>`, so there is no flash), applies on every change to either axis,
 * and follows the OS while the mode is `system`.
 *
 * Call once, at boot. `ThemePicker` and `ThemeModeToggle` are views over the
 * paths this owns and do no DOM or storage work of their own.
 */
export function registerThemeController(
  scena: Scena,
  options: ThemeControllerOptions = {},
): Disposable {
  const {
    idKey = 'scena.theme-id',
    modeKey = 'scena.theme-mode',
    defaultThemeId = 'default',
    defaultMode = 'system',
    persist = true,
  } = options;

  const root = options.root ?? document.documentElement;
  const storage = persist && typeof localStorage !== 'undefined' ? localStorage : null;

  const savedId = storage?.getItem(idKey) ?? null;
  const savedMode = storage?.getItem(modeKey) ?? null;

  scena.store.patchMany({
    [THEME_ID_PATH]: savedId ?? root.getAttribute('data-theme') ?? defaultThemeId,
    [THEME_MODE_PATH]: isThemeChoice(savedMode) ? savedMode : defaultMode,
  });

  function apply(): void {
    const id = scena.store.get<string>(THEME_ID_PATH) ?? defaultThemeId;
    const choice = scena.store.get<ThemeModeChoice>(THEME_MODE_PATH) ?? defaultMode;
    applyTheme(root, id, resolveThemeMode(choice));
    storage?.setItem(idKey, id);
    storage?.setItem(modeKey, choice);
  }
  apply();

  const subs: Disposable[] = [
    scena.store.subscribe(THEME_ID_PATH, apply),
    scena.store.subscribe(THEME_MODE_PATH, apply),
  ];

  // Only re-applies while the choice is `system`; a pinned light/dark ignores
  // the OS entirely, which is the point of pinning it.
  if (typeof window !== 'undefined' && window.matchMedia) {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onSystemChange = (): void => {
      if (scena.store.get<ThemeModeChoice>(THEME_MODE_PATH) === 'system') apply();
    };
    mq.addEventListener('change', onSystemChange);
    subs.push({ dispose: () => mq.removeEventListener('change', onSystemChange) });
  }

  return combineDisposables(...subs);
}
