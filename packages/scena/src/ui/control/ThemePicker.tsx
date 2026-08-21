import type { CSSProperties, ReactNode } from 'react';
import { useStore, useStoreSetter } from '../../react/hooks/useStore.js';
import { listThemes } from '../../styles/index.js';
import { THEME_ID_PATH } from '../../styles/controller.js';
import './ThemePicker.css';

export interface ThemePickerProps {
  // Restrict and order the offered families; defaults to every registered one.
  themes?: string[];
  label?: string;
  // Hide the label and rely on the title attribute — for a tight title bar.
  compact?: boolean;
  className?: string;
  style?: CSSProperties;
}

/**
 * Picks the theme family. A view over `$/ui/theme/id`, same contract as
 * `ThemeModeToggle`: it writes the store and `registerThemeController` does
 * the applying.
 *
 * The options come from the theme registry rather than from a prop, so a theme
 * registered later — by an extension, or lazily — appears here without this
 * component knowing anything about it. That is also why it reads the registry
 * on render instead of caching: `registerTheme` has no change event, and the
 * list is short enough that it does not matter.
 *
 * Renders nothing below two choices. One theme is not a choice, and a select
 * with a single option is a control that cannot do anything — an app that ships
 * only the built-in theme can mount this unconditionally and it stays out of
 * the way until a second theme is registered.
 */
export function ThemePicker({
  themes,
  label = 'Theme',
  compact = false,
  className,
  style,
}: ThemePickerProps): ReactNode {
  const current = useStore<string>(THEME_ID_PATH) ?? 'default';
  const setStore = useStoreSetter();

  const all = listThemes();
  const items = themes
    ? themes.map((id) => all.find((t) => t.id === id)).filter((t) => t !== undefined)
    : all;

  if (items.length < 2) return null;

  return (
    <label
      className={['oo-theme-picker', className].filter(Boolean).join(' ')}
      style={style}
      title={label}
    >
      {compact ? null : <span className="oo-theme-picker__label">{label}</span>}
      <select
        className="oo-theme-picker__select"
        value={current}
        aria-label={label}
        onChange={(e) => setStore(THEME_ID_PATH, e.currentTarget.value)}
      >
        {items.map((theme) => (
          <option key={theme.id} value={theme.id}>
            {theme.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export default ThemePicker;
