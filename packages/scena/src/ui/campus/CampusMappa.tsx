import { type CSSProperties, type MouseEvent as ReactMouseEvent, useSyncExternalStore } from 'react';
import { useCampus } from './context.js';
import type { CampusMappaNode } from './types.js';
import { resolveColorAlpha } from '../../sdk/colors.js';

// Floating minimap overlay for a CampusView. Pulls container size + viewport
// from CampusContext so it can compute the visible-region rectangle without
// the consumer threading a ref. Click anywhere in the minimap to pan-jump
// to that world coord. Designed to be dropped inside the world wrapper or
// outside it — `position: absolute` is anchored to the nearest positioned
// ancestor (CampusView's root, which is `position: relative`).

export interface CampusMappaProps {
  nodes: CampusMappaNode[];
  onJumpTo(worldX: number, worldY: number): void;
  // Anchor + dimensions. Defaults to bottom-right 160×110.
  width?: number;
  height?: number;
  padding?: number;
  // Position overrides — any subset.
  anchor?: { top?: number; right?: number; bottom?: number; left?: number };
  className?: string;
  style?: CSSProperties;
}

const DEFAULT_W = 160;
const DEFAULT_H = 110;
const DEFAULT_PADDING = 12;
const DEFAULT_ANCHOR = { bottom: 12, right: 12 };

export function CampusMappa({
  nodes,
  onJumpTo,
  width = DEFAULT_W,
  height = DEFAULT_H,
  padding = DEFAULT_PADDING,
  anchor = DEFAULT_ANCHOR,
  className,
  style,
}: CampusMappaProps) {
  const { viewportRef, subscribeViewport, container } = useCampus();
  // Subscribe to viewport commits so the minimap redraws as the user pans/
  // zooms — without re-rendering the node subtree (which reads the ref).
  const viewport = useSyncExternalStore(subscribeViewport, () => viewportRef.current);
  if (container.w === 0 || container.h === 0) return null;

  // World bounding box of all nodes.
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const n of nodes) {
    minX = Math.min(minX, n.bounds.x);
    minY = Math.min(minY, n.bounds.y);
    maxX = Math.max(maxX, n.bounds.x + n.bounds.w);
    maxY = Math.max(maxY, n.bounds.y + n.bounds.h);
  }
  // Always include the viewport rect so the user can see where they are
  // even when no nodes exist (or all are off-screen).
  const viewLeft = -viewport.panX / viewport.scale;
  const viewTop = -viewport.panY / viewport.scale;
  const viewRight = viewLeft + container.w / viewport.scale;
  const viewBottom = viewTop + container.h / viewport.scale;
  if (!isFinite(minX)) {
    minX = viewLeft; minY = viewTop; maxX = viewRight; maxY = viewBottom;
  } else {
    minX = Math.min(minX, viewLeft);
    minY = Math.min(minY, viewTop);
    maxX = Math.max(maxX, viewRight);
    maxY = Math.max(maxY, viewBottom);
  }

  const worldW = Math.max(1, maxX - minX);
  const worldH = Math.max(1, maxY - minY);
  const innerW = width - padding * 2;
  const innerH = height - padding * 2;
  const scale = Math.min(innerW / worldW, innerH / worldH);

  function worldToMini(x: number, y: number): [number, number] {
    return [padding + (x - minX) * scale, padding + (y - minY) * scale];
  }

  function onMiniClick(e: ReactMouseEvent<HTMLDivElement>): void {
    const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
    const miniX = e.clientX - rect.left;
    const miniY = e.clientY - rect.top;
    const wx = (miniX - padding) / scale + minX;
    const wy = (miniY - padding) / scale + minY;
    onJumpTo(wx, wy);
  }

  const [vx, vy] = worldToMini(viewLeft, viewTop);
  const vw = (viewRight - viewLeft) * scale;
  const vh = (viewBottom - viewTop) * scale;

  return (
    <div
      className={['oo-campus-mappa', className].filter(Boolean).join(' ')}
      onClick={onMiniClick}
      onPointerDown={(e) => e.stopPropagation()}
      style={{
        position: 'absolute',
        ...anchor,
        width,
        height,
        // Opt back into pointer events: the CampusVelum overlay that hosts
        // the minimap is pointer-transparent so it doesn't block the canvas.
        pointerEvents: 'auto',
        background: 'rgba(20, 20, 24, 0.75)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        borderRadius: 'var(--oo-radius-sm, 4px)',
        boxShadow: '0 6px 20px rgba(0, 0, 0, 0.32)',
        cursor: 'crosshair',
        zIndex: 40,
        overflow: 'hidden',
        ...style,
      }}
    >
      {nodes.map((n) => {
        const [mx, my] = worldToMini(n.bounds.x, n.bounds.y);
        const mw = Math.max(2, n.bounds.w * scale);
        const mh = Math.max(2, n.bounds.h * scale);
        return (
          <div
            key={n.id}
            title={n.id}
            style={{
              position: 'absolute',
              left: mx,
              top: my,
              width: mw,
              height: mh,
              background: resolveColorAlpha(n.color, 0.85),
              border: n.selected
                ? '1px solid rgba(255, 255, 255, 0.9)'
                : '1px solid rgba(255, 255, 255, 0.18)',
              borderRadius: 2,
              boxSizing: 'border-box',
            }}
          />
        );
      })}
      {/* Viewport rectangle */}
      <div
        style={{
          position: 'absolute',
          left: vx,
          top: vy,
          width: vw,
          height: vh,
          border: '1px solid rgba(255, 255, 255, 0.9)',
          background: 'rgba(255, 255, 255, 0.06)',
          pointerEvents: 'none',
          boxSizing: 'border-box',
        }}
      />
    </div>
  );
}
