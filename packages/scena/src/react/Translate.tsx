import type { ReactNode } from 'react';
import { useI18n } from './hooks/useI18n.js';
import type { TranslateOptions } from '../i18n/registry.js';

export interface TranslateProps {
  // Message key, e.g. 'user/nameLabel' (dots or slashes). With `ns` it's
  // prefixed: <Translate ns="user" k="nameLabel" />.
  k: string;
  ns?: string;
  // Inline English fallback used when the key is unregistered.
  fallback?: string;
  // Any other prop is an interpolation param for `{token}` in the message.
  [param: string]: unknown;
}

// Renders a translated message reactively — re-renders on locale switch. For
// hand-written JSX where a label/value is a ReactNode AND you're outside a
// component (config, column defs) so you can't call useI18n directly. For
// declarative ComponentNodes, bind `{ path: '$/t/<key>' }` instead.
export function Translate({ k, ns, ...params }: TranslateProps): ReactNode {
  const { t } = useI18n(ns);
  return <>{t(k, params as TranslateOptions)}</>;
}
