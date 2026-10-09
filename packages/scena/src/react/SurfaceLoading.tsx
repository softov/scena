import type { ReactElement } from 'react';

/**
 * What a surface shows while its component's chunk loads: a ring, centred.
 * Styled by `.oo-surface-loading` in styles/surface.css.
 */
export function SurfaceLoading(): ReactElement {
  return <div className="oo-surface-loading" role="status" aria-label="Loading"><span aria-hidden /></div>;
}
