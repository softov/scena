import type { CSSProperties, ReactNode } from 'react';

// Fixed overlay layer laid in FRONT of all strata. CampusView routes its
// `children` here, so HUD pieces (minimap, toolbars, selection footers) stay
// pinned to the container and never inherit the world's pan/zoom transform —
// which is exactly the bug that surfaced when CampusMappa rendered inside the
// transformed world wrapper.
//
// The velum itself is pointer-transparent (`pointerEvents: none`) so it
// doesn't swallow background pan/click on the canvas underneath. Each HUD
// child opts back in with `pointerEvents: auto` (CampusMappa does this).

export interface CampusVelumProps {
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
}

export function CampusVelum({ className, style, children }: CampusVelumProps) {
  if (children == null || children === false) return null;
  return (
    <div
      className={['oo-campus-velum', className].filter(Boolean).join(' ')}
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 30,
        ...style,
      }}
    >
      {children}
    </div>
  );
}
