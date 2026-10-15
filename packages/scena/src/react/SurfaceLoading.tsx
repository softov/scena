import type { ReactElement } from 'react';
import { useI18n } from './hooks/useI18n.js';

/**
 * What a surface shows while its component's chunk loads: a ring, centred.
 * Styled by `.oo-surface-loading` in styles/surface.css.
 */
export function SurfaceLoading(): ReactElement {
  const { t } = useI18n();
  return <div className="oo-surface-loading" role="status" aria-label={t('common/loading', 'Loading')}><span aria-hidden /></div>;
}
