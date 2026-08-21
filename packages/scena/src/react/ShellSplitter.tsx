import { type CSSProperties, type PointerEvent, useRef } from 'react';
import type { SurfaceName } from '../sdk/mount-surface.js';
import { useScena } from './ScenaProvider.js';

export interface ShellSplitterProps {
  // The surface whose size this splitter controls.
  surface: SurfaceName;
  // Drag axis. 'vertical' = horizontal drag (resizes width).
  orientation: 'vertical' | 'horizontal';
  // If false (default), positive pointer delta along the drag axis grows the surface.
  // Use true when the splitter sits on the surface's leading edge
  // (e.g., between main and sidebar:right — dragging LEFT grows sidebar:right).
  invert?: boolean;
  min?: number;
  max?: number;
  // Optional visual thickness (px). Default 4.
  thickness?: number;
  style?: CSSProperties;
  className?: string;
}

// Chrome-level drag handle. Writes the dragged size to
// `scena.layout.setSurface(surface, { size })`, which mirrors to the
// `layout:surfaces.<name>.size` path and persists via LayoutStorage.
//
// Used by DefaultShell between adjacent surfaces; apps with custom shells
// can drop these in wherever they want a resizable edge.
export function ShellSplitter({
  surface,
  orientation,
  invert = false,
  min = 100,
  max = 800,
  thickness = 4,
  style,
  className,
}: ShellSplitterProps) {
  const scena = useScena();
  const draggingRef = useRef(false);
  const startSizeRef = useRef(0);
  const startPosRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const pendingSizeRef = useRef<number | null>(null);

  // Transient while the pointer is down: the frame still re-renders the shell,
  // but the layout is not mirrored into the reactive store (which wakes every
  // `useStore` in the app) and not serialised to storage. Releasing commits once.
  function commitPending(transient: boolean) {
    if (pendingSizeRef.current !== null) {
      scena.layout.setSurface(surface, { size: pendingSizeRef.current }, { transient });
      pendingSizeRef.current = null;
    }
    rafRef.current = null;
  }

  function onPointerDown(e: PointerEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    draggingRef.current = true;
    startSizeRef.current = scena.layout.get().surfaces[surface]?.size ?? 240;
    startPosRef.current = orientation === 'vertical' ? e.clientX : e.clientY;
    (e.currentTarget as HTMLElement).style.background = 'var(--oo-color-accent)';
    // `user-select: none` on the handle alone does not stop the drag from
    // selecting text across the surfaces either side of it, because the pointer
    // is captured but the selection is the document's.
    document.documentElement.classList.add('oo-resizing');
    document.documentElement.style.cursor =
      orientation === 'vertical' ? 'ew-resize' : 'ns-resize';
  }

  function onPointerCancel(e: PointerEvent<HTMLDivElement>) {
    onPointerUp(e);
  }

  function onPointerMove(e: PointerEvent<HTMLDivElement>) {
    if (!draggingRef.current) return;
    const pos = orientation === 'vertical' ? e.clientX : e.clientY;
    const delta = pos - startPosRef.current;
    const signed = invert ? -delta : delta;
    const next = Math.max(min, Math.min(max, startSizeRef.current + signed));
    pendingSizeRef.current = next;
    if (rafRef.current === null) {
      rafRef.current = requestAnimationFrame(() => commitPending(true));
    }
  }

  function onPointerUp(e: PointerEvent<HTMLDivElement>) {
    if (!draggingRef.current) return;
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    // The settled value, and the only one that reaches the store or storage.
    // Falls back to the last size when the pointer never moved, so a click on
    // the handle still ends in a consistent state rather than a half-committed
    // transient one.
    pendingSizeRef.current ??= scena.layout.get().surfaces[surface]?.size ?? startSizeRef.current;
    commitPending(false);
    (e.currentTarget as Element).releasePointerCapture(e.pointerId);
    draggingRef.current = false;
    (e.currentTarget as HTMLElement).style.background = 'none';
    document.documentElement.classList.remove('oo-resizing');
    document.documentElement.style.cursor = '';
  }

  const baseStyle: CSSProperties =
    orientation === 'vertical'
      ? { width: thickness, height: '100%', cursor: 'ew-resize' }
      : { width: '100%', height: thickness, cursor: 'ns-resize' };

  return (
    <div
      className={`oo-shell-splitter oo-shell-splitter--${orientation} ${className ?? ''}`}
      data-surface={surface}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      style={{
        flex: '0 0 auto',
        background: 'transparent',
        userSelect: 'none',
        touchAction: 'none',
        transition: 'background 0.15s',
        ...baseStyle,
        ...style,
      }}
    />
  );
}
