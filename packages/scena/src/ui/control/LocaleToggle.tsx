import { Fragment, type CSSProperties, type ReactNode } from 'react';
import { useI18n } from '../../react/hooks/useI18n.js';
import type { LocaleInfo } from '../../core/i18n/registry.js';
import './LocaleToggle.css';

export type LocaleToggleDisplay = 'text' | 'emoji' | 'both';

export interface LocaleToggleProps {
  // 'text' → PT | EN | ES ; 'emoji' → 🇧🇷 | 🇺🇸 ; 'both' → 🇧🇷 PT
  display?: LocaleToggleDisplay;
  // Filter + order the offered locales; defaults to every registered locale.
  locales?: string[];
  // Rendered between items; pass null to omit. Default '|'.
  separator?: ReactNode;
  className?: string;
  style?: CSSProperties;
}

// A configurable language switcher. Reads the registered locales + active
// locale from the i18n registry (useI18n); clicking sets the locale, which
// re-renders every translated view. The active locale gets an accent.
export function LocaleToggle({
  display = 'text',
  locales,
  separator = '|',
  className,
  style,
}: LocaleToggleProps): ReactNode {
  const { locale: current, locales: all, setLocale } = useI18n();
  const items = locales
    ? (locales.map((l) => all.find((i) => i.locale === l)).filter(Boolean) as LocaleInfo[])
    : all;

  return (
    <div
      className={['oo-locale-toggle', className].filter(Boolean).join(' ')}
      style={style}
      role="group"
    >
      {items.map((info, i) => (
        <Fragment key={info.locale}>
          {i > 0 && separator != null ? (
            <span className="oo-locale-toggle__sep" aria-hidden="true">
              {separator}
            </span>
          ) : null}
          <button
            type="button"
            className={
              'oo-locale-toggle__item' +
              (info.locale === current ? ' oo-locale-toggle__item--active' : '')
            }
            aria-pressed={info.locale === current}
            title={info.name ?? info.locale}
            onClick={() => setLocale(info.locale)}
          >
            {labelFor(info, display)}
          </button>
        </Fragment>
      ))}
    </div>
  );
}

function labelFor(info: LocaleInfo, display: LocaleToggleDisplay): string {
  const text = (info.language ?? info.locale).toUpperCase();
  if (display === 'emoji') return info.emoji ?? text;
  if (display === 'both') return info.emoji ? `${info.emoji} ${text}` : text;
  return text;
}
