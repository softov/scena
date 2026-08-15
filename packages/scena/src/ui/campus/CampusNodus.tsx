import {
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from 'react';
import { useCampus } from './context.js';
import { useStratumZoom } from './stratum-context.js';
import type { CampusBounds } from './types.js';

// A generic positioned node inside a CampusView. Owns its own move drag
// (started from any descendant matching `dragHandle`) and 8-direction resize
// state machines; the parent only sees committed bounds at pointerup. Coords
// may be negative; drag/resize clamps to the campus's [-maxDepth, +maxDepth]
// world bounds (read from CampusContext).
//
// The node renders the matched node-type component as its `children`; that
// component supplies its own chrome (header/body) and marks its drag region
// with `data-campus-drag` (the default `dragHandle` selector).
//
// The node renders absolutely-positioned inside a CampusStratum (itself
// inside the CampusView world wrapper, which is
// `transform: translate(...) scale(...)`-transformed), so left/top/width/
// height here are world pixels.

export type ResizeMode = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';
export type DragMode = 'move' | ResizeMode;

const RESIZE_CURSORS: Record<ResizeMode, string> = {
  n: 'ns-resize',
  s: 'ns-resize',
  e: 'ew-resize',
  w: 'ew-resize',
  ne: 'nesw-resize',
  sw: 'nesw-resize',
  nw: 'nwse-resize',
  se: 'nwse-resize',
};

const DEFAULT_MIN_SIZE = { w: 80, h: 60 };

export interface CampusNodusProps {
  bounds: CampusBounds;
  // Fires once on pointerup (or once per rAF during drag if `live` is set).
  onCommit(next: CampusBounds): void;
  // Optional minimum size during resize; defaults to 80×60.
  minSize?: { w: number; h: number };
  // Optional fixed size — when set, resize handles are not rendered.
  resizable?: boolean;
  // Optional fixed position — when set, no move drag is wired.
  movable?: boolean;
  // CSS selector for the move-drag region within `children`. A move starts
  // only when the pointerdown target is inside an element matching this.
  // Defaults to `[data-campus-drag]`.
  dragHandle?: string;
  // Selection styling hook. The node itself doesn't manage selection state;
  // callers usually pair this with onPointerDownCapture/onContextMenu.
  selected?: boolean;
  // Stacking. Selected nodes typically bump to 10 to overlay others.
  zIndex?: number;
  // Node content (the matched node-type component). Supplies its own chrome
  // and marks its drag region with `data-campus-drag`.
  children?: ReactNode;
  // Pass-through interaction handlers.
  onPointerDownCapture?(e: ReactPointerEvent<HTMLDivElement>): void;
  onClick?(e: ReactMouseEvent<HTMLDivElement>): void;
  onContextMenu?(e: ReactMouseEvent<HTMLDivElement>): void;
  className?: string;
  style?: CSSProperties;
  bodyStyle?: CSSProperties;
}

function applyResize(
  mode: ResizeMode,
  start: CampusBounds,
  dx: number,
  dy: number,
  min: { w: number; h: number },
  maxDepth: number,
): CampusBounds {
  let x = start.x;
  let y = start.y;
  let w = start.w;
  let h = start.h;
  if (mode.includes('w')) { x = start.x + dx; w = start.w - dx; }
  if (mode.includes('e')) { w = start.w + dx; }
  if (mode.includes('n')) { y = start.y + dy; h = start.h - dy; }
  if (mode.includes('s')) { h = start.h + dy; }
  // Min-size clamp preserves the anchored edge.
  if (w < min.w) {
    if (mode.includes('w')) x = start.x + (start.w - min.w);
    w = min.w;
  }
  if (h < min.h) {
    if (mode.includes('n')) y = start.y + (start.h - min.h);
    h = min.h;
  }
  // World-bounds clamp. Origin can be negative; only enforced when
  // maxDepth is finite. The west/north edges clamp to -maxDepth; the
  // east/south edges clamp to +maxDepth, with width/height adjusted to
  // keep the anchored edge stable.
  if (isFinite(maxDepth)) {
    if (x < -maxDepth) {
      if (mode.includes('w')) w = start.x + start.w - (-maxDepth);
      x = -maxDepth;
    }
    if (y < -maxDepth) {
      if (mode.includes('n')) h = start.y + start.h - (-maxDepth);
      y = -maxDepth;
    }
    if (x + w > maxDepth) w = maxDepth - x;
    if (y + h > maxDepth) h = maxDepth - y;
  }
  return { x, y, w, h };
}

function clampMove(
  start: CampusBounds,
  dx: number,
  dy: number,
  maxDepth: number,
): CampusBounds {
  let x = start.x + dx;
  let y = start.y + dy;
  if (isFinite(maxDepth)) {
    x = Math.max(-maxDepth, Math.min(maxDepth - start.w, x));
    y = Math.max(-maxDepth, Math.min(maxDepth - start.h, y));
  }
  return { ...start, x, y };
}

export function CampusNodus({
  bounds,
  onCommit,
  minSize = DEFAULT_MIN_SIZE,
  resizable = true,
  movable = true,
  dragHandle = '[data-campus-drag]',
  selected = false,
  zIndex,
  children,
  onPointerDownCapture,
  onClick,
  onContextMenu,
  className,
  style,
  bodyStyle,
}: CampusNodusProps) {
  const { viewportRef, maxDepth } = useCampus();
  const stratumZoom = useStratumZoom();
  // Live local bounds during drag (so React state updates ~1×/frame instead
  // of every pointermove). `null` means "no drag in progress; render the
  // controlled `bounds` prop directly".
  const [live, setLive] = useState<CampusBounds | null>(null);
  const dragRef = useRef<{
    mode: DragMode;
    startX: number;
    startY: number;
    start: CampusBounds;
  } | null>(null);
  const rafRef = useRef<number | null>(null);
  const pendingRef = useRef<CampusBounds | null>(null);

  // Reset live state whenever controlled bounds change from outside (e.g.,
  // parent committed our previous drag, or layout snapshotted everything).
  useEffect(() => {
    setLive(null);
  }, [bounds.x, bounds.y, bounds.w, bounds.h]);

  // Drag math reads the live EFFECTIVE scale (viewport × this stratum's
  // static zoom) straight from the campus viewport ref inside pointer
  // handlers — so a wheel-zoom mid-drag stays 1:1, dragging stays 1:1 inside
  // a scaled layer, AND this node never re-renders on pan/zoom.

  function flush() {
    if (pendingRef.current) {
      setLive(pendingRef.current);
      pendingRef.current = null;
    }
    rafRef.current = null;
  }

  function startDrag(mode: DragMode, e: ReactPointerEvent<HTMLDivElement>): void {
    e.preventDefault();
    e.stopPropagation();
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    dragRef.current = {
      mode,
      startX: e.clientX,
      startY: e.clientY,
      start: live ?? bounds,
    };
  }
  // Move drag starts from the root, but only when the pointerdown lands
  // inside the `dragHandle` region of the node content. Resize handles
  // stopPropagation in their own pointerdown, so they never reach here.
  function onRootPointerDown(e: ReactPointerEvent<HTMLDivElement>): void {
    if (!movable) return;
    const target = e.target as HTMLElement | null;
    if (!target || !target.closest(dragHandle)) return;
    startDrag('move', e);
  }
  function onPointerMove(e: ReactPointerEvent<HTMLDivElement>): void {
    const d = dragRef.current;
    if (!d) return;
    const s = (viewportRef.current.scale * stratumZoom) || 1;
    const dx = (e.clientX - d.startX) / s;
    const dy = (e.clientY - d.startY) / s;
    const next: CampusBounds =
      d.mode === 'move'
        ? clampMove(d.start, dx, dy, maxDepth)
        : applyResize(d.mode, d.start, dx, dy, minSize, maxDepth);
    pendingRef.current = next;
    if (rafRef.current === null) rafRef.current = requestAnimationFrame(flush);
  }
  function endDrag(e: ReactPointerEvent<HTMLDivElement>): void {
    if (!dragRef.current) return;
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      flush();
    }
    (e.currentTarget as Element).releasePointerCapture(e.pointerId);
    const final = pendingRef.current ?? live ?? bounds;
    pendingRef.current = null;
    dragRef.current = null;
    onCommit(final);
  }

  const visible = live ?? bounds;
  const rootStyle: CSSProperties = {
    position: 'absolute',
    left: visible.x,
    top: visible.y,
    width: visible.w,
    height: visible.h,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    zIndex: zIndex ?? (selected ? 10 : 1),
    background: 'var(--oo-color-canvas)',
    border: `1px solid ${selected ? 'var(--oo-color-accent)' : 'var(--oo-color-border)'}`,
    borderRadius: 'var(--oo-radius-sm)',
    boxShadow: selected ? 'var(--oo-shadow-lg)' : 'var(--oo-shadow-md)',
    ...style,
  };

  return (
    <div
      className={['oo-campus-nodus', className].filter(Boolean).join(' ')}
      data-selected={selected}
      style={rootStyle}
      onPointerDownCapture={onPointerDownCapture}
      onPointerDown={onRootPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onClick={onClick}
      onContextMenu={onContextMenu}
    >
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden', ...bodyStyle }}>
        {children}
      </div>

      {resizable ? (
        <>
          <ResizeHandle mode="n" startDrag={startDrag} onPointerMove={onPointerMove} endDrag={endDrag} />
          <ResizeHandle mode="s" startDrag={startDrag} onPointerMove={onPointerMove} endDrag={endDrag} />
          <ResizeHandle mode="e" startDrag={startDrag} onPointerMove={onPointerMove} endDrag={endDrag} />
          <ResizeHandle mode="w" startDrag={startDrag} onPointerMove={onPointerMove} endDrag={endDrag} />
          <ResizeHandle mode="nw" startDrag={startDrag} onPointerMove={onPointerMove} endDrag={endDrag} />
          <ResizeHandle mode="ne" startDrag={startDrag} onPointerMove={onPointerMove} endDrag={endDrag} />
          <ResizeHandle mode="sw" startDrag={startDrag} onPointerMove={onPointerMove} endDrag={endDrag} />
          <ResizeHandle mode="se" startDrag={startDrag} onPointerMove={onPointerMove} endDrag={endDrag} />
        </>
      ) : null}
    </div>
  );
}

interface ResizeHandleProps {
  mode: ResizeMode;
  startDrag: (mode: DragMode, e: ReactPointerEvent<HTMLDivElement>) => void;
  onPointerMove: (e: ReactPointerEvent<HTMLDivElement>) => void;
  endDrag: (e: ReactPointerEvent<HTMLDivElement>) => void;
}

function ResizeHandle({ mode, startDrag, onPointerMove, endDrag }: ResizeHandleProps) {
  const HANDLE_THICKNESS = 6;
  const CORNER_SIZE = 12;
  const isCorner = mode.length === 2;

  let style: CSSProperties;
  if (isCorner) {
    style = {
      position: 'absolute',
      width: CORNER_SIZE,
      height: CORNER_SIZE,
      cursor: RESIZE_CURSORS[mode],
      touchAction: 'none',
      zIndex: 1,
      ...(mode.includes('n') ? { top: -CORNER_SIZE / 2 } : { bottom: -CORNER_SIZE / 2 }),
      ...(mode.includes('w') ? { left: -CORNER_SIZE / 2 } : { right: -CORNER_SIZE / 2 }),
    };
  } else {
    const horizontal = mode === 'n' || mode === 's';
    style = {
      position: 'absolute',
      cursor: RESIZE_CURSORS[mode],
      touchAction: 'none',
      zIndex: 1,
      ...(horizontal
        ? {
            left: CORNER_SIZE,
            right: CORNER_SIZE,
            height: HANDLE_THICKNESS,
            ...(mode === 'n' ? { top: -HANDLE_THICKNESS / 2 } : { bottom: -HANDLE_THICKNESS / 2 }),
          }
        : {
            top: CORNER_SIZE,
            bottom: CORNER_SIZE,
            width: HANDLE_THICKNESS,
            ...(mode === 'w' ? { left: -HANDLE_THICKNESS / 2 } : { right: -HANDLE_THICKNESS / 2 }),
          }),
    };
  }

  return (
    <div
      className={`oo-campus-nodus-resize oo-campus-nodus-resize--${mode}`}
      onPointerDown={(e) => startDrag(mode, e)}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      style={style}
    />
  );
}
