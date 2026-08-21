import type { CSSProperties, ReactNode } from 'react';
import { useStore, useStoreSetter } from '../../react/hooks/useStore.js';
import { THEME_MODE_PATH, type ThemeModeChoice } from '../../styles/controller.js';
import './ThemeModeToggle.css';

const ORDER: ThemeModeChoice[] = ['light', 'dark', 'system'];
const ICON: Record<ThemeModeChoice, string> = {
  light: '☀︎',
  dark: '☾︎',
  system: '◐︎',
};
const TITLE: Record<ThemeModeChoice, string> = {
  light: 'Light',
  dark: 'Dark',
  system: 'Follow system',
};

export interface ThemeModeToggleProps {
  // Which choices to cycle through. Drop 'system' if the app pins a mode.
  modes?: ThemeModeChoice[];
  // 'icon' → ☀ ; 'text' → Light ; 'both' → ☀ Light
  display?: 'icon' | 'text' | 'both';
  className?: string;
  style?: CSSProperties;
}

/**
 * Cycles the theme mode. A view over `$/ui/theme/mode` — it writes the store
 * and nothing else, so `registerThemeController` stays the only thing that
 * touches the DOM or localStorage, and any other control over the same path
 * (a settings select, say) stays in agreement with it for free.
 *
 * Requires `registerThemeController`; without it the path is never applied and
 * clicking appears to do nothing.
 */
export function ThemeModeToggle({
  modes = ORDER,
  display = 'icon',
  className,
  style,
}: ThemeModeToggleProps): ReactNode {
  const mode = useStore<ThemeModeChoice>(THEME_MODE_PATH) ?? 'system';
  const setStore = useStoreSetter();

  const index = modes.indexOf(mode);
  // An unlisted current mode would make indexOf return -1 and the first click
  // land on modes[0] — which is the right recovery, so it is left alone.
  const next = modes[(index + 1) % modes.length] ?? modes[0]!;

  return (
    <button
      type="button"
      className={['oo-theme-mode-toggle', className].filter(Boolean).join(' ')}
      style={style}
      data-mode={mode}
      title={`${TITLE[mode]} — click for ${TITLE[next].toLowerCase()}`}
      aria-label={`Theme mode: ${TITLE[mode]}`}
      onClick={() => setStore(THEME_MODE_PATH, next)}
    >
      {display !== 'text' ? <span aria-hidden="true">{ICON[mode]}</span> : null}
      {display !== 'icon' ? <span>{TITLE[mode]}</span> : null}
    </button>
  );
}

export default ThemeModeToggle;
