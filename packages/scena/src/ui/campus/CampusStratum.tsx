import type { CSSProperties, ReactNode } from 'react';
import { StratumContext } from './stratum-context.js';

// One stacking layer inside a CampusView's world. Strata exist so nodes can
// be grouped and z-ordered (and, later, parallaxed) without each node
// managing its own stacking. Rendered INSIDE the world wrapper, so it shares
// the single viewport transform; `zoom`/`pan` here are a static offset baked
// on top of that shared transform, NOT an independent viewport.
//
// The stratum is a zero-size box pinned at the world origin (left/top 0,
// width/height 0); its absolutely-positioned node children read world
// coordinates straight from their bounds, exactly as if they sat in the
// world wrapper directly.

export interface CampusStratumProps {
  // Static scale on top of the shared viewport. Published to descendant
  // nodes via StratumContext so their drag math stays 1:1. Default 1.
  zoom?: number;
  // Static world-pixel offset for the whole layer. Default {0,0}.
  pan?: { x: number; y: number };
  // Stacking order; higher renders in front. Maps to CampusLayerConfig.index.
  zIndex?: number;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
}

export function CampusStratum({
  zoom = 1,
  pan,
  zIndex,
  className,
  style,
  children,
}: CampusStratumProps) {
  const tx = pan?.x ?? 0;
  const ty = pan?.y ?? 0;
  const transform =
    tx !== 0 || ty !== 0 || zoom !== 1
      ? `translate(${tx}px, ${ty}px) scale(${zoom})`
      : undefined;

  return (
    <StratumContext.Provider value={zoom}>
      <div
        className={['oo-campus-stratum', className].filter(Boolean).join(' ')}
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: 0,
          height: 0,
          transformOrigin: '0 0',
          transform,
          zIndex,
          ...style,
        }}
      >
        {children}
      </div>
    </StratumContext.Provider>
  );
}
