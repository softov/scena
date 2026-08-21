import { useCallback, useSyncExternalStore } from 'react';
import {
  subscribeI18n,
  getLocale,
  getLocaleInfo,
  listLocaleInfo,
  translate,
  setLocale,
  type LocaleInfo,
  type TranslateOptions,
} from '../../core/i18n/registry.js';

export interface UseI18nResult {
  // t(key), t(key, 'Inline fallback'), or t(key, { fallback, ...params }).
  t: (key: string, fallbackOrOptions?: string | TranslateOptions) => string;
  locale: string;
  info: LocaleInfo | undefined; // current locale metadata (emoji/name/dir)
  locales: LocaleInfo[]; // all known locales — for language pickers
  setLocale: (locale: string) => void;
}

// Reactive translation for hand-written React. Subscribes to the i18n registry,
// so the component re-renders on locale switch / message registration. Optional
// `namespace` is prefixed to every key. For declarative ComponentNodes, bind
// `{ path: '$/t/<key>' }` instead (served by the i18n ScopeBackend).
export function useI18n(namespace?: string): UseI18nResult {
  const locale = useSyncExternalStore(subscribeI18n, getLocale, getLocale);
  const t = useCallback(
    (key: string, fallbackOrOptions?: string | TranslateOptions) =>
      translate(namespace ? `${namespace}/${key}` : key, fallbackOrOptions),
    // `locale` is deliberately a dependency even though `translate` reads it
    // internally: consumers memoize on `t`, so its identity must change on a
    // locale switch or they render stale translations.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [namespace, locale],
  );
  return { t, locale, info: getLocaleInfo(locale), locales: listLocaleInfo(), setLocale };
}
