import type { BindingPath, Disposable, Scena } from '@softov/scena/types';
import { combineDisposables } from '@softov/scena';
import { applyTheme, type ThemeMode } from '@softov/scena/styles';

// Single source of truth for theme. ThemeToggle, ThemePicker, and the
// SettingsPanel select all read/write through these paths via useStore,
// so any of them stays in sync with the others. The localStorage write +
// applyTheme() call happen in ONE subscriber here — no consumer touches
// the DOM or storage directly anymore.

export type ThemeModeChoice = ThemeMode | 'system';

export const THEME_ID_PATH = '$/ui/theme/id' as BindingPath;
export const THEME_MODE_PATH = '$/ui/theme/mode' as BindingPath;

const THEME_ID_KEY = 'scena-dev.theme-id';
const THEME_MODE_KEY = 'scena-dev.theme-mode';

function isThemeChoice(v: unknown): v is ThemeModeChoice {
  return v === 'light' || v === 'dark' || v === 'system';
}

export function resolveMode(choice: ThemeModeChoice): ThemeMode {
  if (choice !== 'system') return choice;
  return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function registerTheme(scena: Scena): Disposable {
  const savedId = localStorage.getItem(THEME_ID_KEY);
  const savedMode = localStorage.getItem(THEME_MODE_KEY);
  const initialId = savedId ?? document.documentElement.getAttribute('data-theme') ?? 'default';
  const initialMode: ThemeModeChoice = isThemeChoice(savedMode) ? savedMode : 'system';

  scena.store.patchMany({
    [THEME_ID_PATH]: initialId,
    [THEME_MODE_PATH]: initialMode,
  });

  function apply(): void {
    const id = scena.store.get<string>(THEME_ID_PATH) ?? 'default';
    const choice = scena.store.get<ThemeModeChoice>(THEME_MODE_PATH) ?? 'system';
    applyTheme(document.documentElement, id, resolveMode(choice));
    localStorage.setItem(THEME_ID_KEY, id);
    localStorage.setItem(THEME_MODE_KEY, choice);
  }
  apply();

  const subs: Disposable[] = [
    scena.store.subscribe(THEME_ID_PATH, apply),
    scena.store.subscribe(THEME_MODE_PATH, apply),
  ];

  const mq = matchMedia('(prefers-color-scheme: dark)');
  const onSystemChange = (): void => {
    if (scena.store.get<ThemeModeChoice>(THEME_MODE_PATH) === 'system') apply();
  };
  mq.addEventListener('change', onSystemChange);
  subs.push({ dispose: () => mq.removeEventListener('change', onSystemChange) });

  return combineDisposables(...subs);
}
