import { type PointerEvent as ReactPointerEvent, useCallback, useRef } from 'react';
import type { SurfaceName } from '../sdk/mount-surface.js';
import type { SurfacePresentation } from '../sdk/layout.js';
import { useScena } from './ScenaProvider.js';

/**
 * Resizing a surface by its own edge, with no handle in the layout.
 *
 * The alternative to `ShellSplitter`, and a different model rather than a
 * restyle of it. A splitter is a real element the shell has to place between two
 * surfaces; it takes part in flex, it has to be conditionally rendered next to
 * whichever surfaces happen to be visible, and its hit area is its width. Here
 * the grip is a `::after` on the surface, so it costs the layout nothing, it
 * cannot be rendered in the wrong place, and the hit zone is 10px while the line
 * stays 1px.
 *
 * It also self-disables. A surface that is floating, sheeted or reduced to a bar
 * has no dock boundary to drag, and the grip disappears with the presentation
 * rather than the shell having to remember to stop rendering a splitter.
 */
export interface SurfaceResizeSpec {
  /**
   * Which of the surface's own edges carries the grip.
   *
   * The edge is the side that moves: a left sidebar is resized by its `right`
   * edge, a right sidebar by its `left`, a bottom panel by its `top`.
   */
  edge: 'left' | 'right' | 'top' | 'bottom';
  min?: number;
  max?: number;
  /** Hit zone in px. The visible line is 1px regardless. Default 10. */
  grip?: number;
}

/** Only a docked surface has a boundary worth dragging. */
function resizableIn(presentation: SurfacePresentation): boolean {
  return presentation === 'docked';
}

function withinGrip(
  element: HTMLElement,
  edge: SurfaceResizeSpec['edge'],
  clientX: number,
  clientY: number,
  grip: number,
): boolean {
  const rect = element.getBoundingClientRect();
  if (edge === 'right') return clientX >= rect.right - grip && clientX <= rect.right;
  if (edge === 'left') return clientX <= rect.left + grip && clientX >= rect.left;
  if (edge === 'top') return clientY <= rect.top + grip && clientY >= rect.top;
  return clientY >= rect.bottom - grip && clientY <= rect.bottom;
}

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

export interface SurfaceResizeBinding {
  ref: (node: HTMLDivElement | null) => void;
  'data-resize'?: string;
  onPointerMove?: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onPointerLeave?: () => void;
  onPointerDown?: (event: ReactPointerEvent<HTMLDivElement>) => void;
}

export function useSurfaceResize(
  surface: SurfaceName,
  presentation: SurfacePresentation,
  spec: SurfaceResizeSpec | undefined,
): SurfaceResizeBinding {
  const scena = useScena();
  const elementRef = useRef<HTMLDivElement | null>(null);
  const draggingRef = useRef(false);
  const rafRef = useRef<number | null>(null);
  // Separate from the frame handle. The handle is assigned *after*
  // requestAnimationFrame returns, so a callback that runs before that (a
  // synchronous or already-due frame) has its `null` overwritten by the
  // assignment and no further frame is ever scheduled.
  const scheduledRef = useRef(false);
  const pendingRef = useRef<number | null>(null);

  const ref = useCallback((node: HTMLDivElement | null) => {
    elementRef.current = node;
  }, []);

  const active = spec !== undefined && resizableIn(presentation);
  const edge = spec?.edge ?? 'right';
  const grip = spec?.grip ?? 10;
  const min = spec?.min ?? 100;
  const max = spec?.max ?? 800;
  const vertical = edge === 'left' || edge === 'right';

  // `data-resize-state` is written straight to the node rather than held in
  // state: it changes on every pointermove across the surface, and a re-render
  // per mouse move is exactly the cost this whole model is avoiding.
  const mark = useCallback((state: 'idle' | 'hot' | 'active') => {
    elementRef.current?.setAttribute('data-resize-state', state);
  }, []);

  const commit = useCallback(
    (transient: boolean) => {
      scheduledRef.current = false;
      if (pendingRef.current !== null) {
        scena.layout.setSurface(surface, { size: pendingRef.current }, { transient });
        pendingRef.current = null;
      }
    },
    [scena, surface],
  );

  const onPointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      const element = elementRef.current;
      if (element === null || !active) return;
      if (draggingRef.current) return;
      mark(withinGrip(element, edge, event.clientX, event.clientY, grip) ? 'hot' : 'idle');
    },
    [active, edge, grip, mark],
  );

  const onPointerLeave = useCallback(() => {
    if (!draggingRef.current) mark('idle');
  }, [mark]);

  const onPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      const element = elementRef.current;
      if (element === null || !active) return;
      if (!withinGrip(element, edge, event.clientX, event.clientY, grip)) return;
      event.preventDefault();

      const rect = element.getBoundingClientRect();
      // Measured, not read from layout state: a surface whose size has never
      // been set still has a real width, and the drag should start from it
      // rather than from a default that would make it jump on the first pixel.
      const startSize = vertical ? rect.width : rect.height;
      const startPos = vertical ? event.clientX : event.clientY;
      // The edge that moves toward the surface's origin grows it as the pointer
      // travels backwards, so the delta is inverted for `left` and `top`.
      const sign = edge === 'right' || edge === 'bottom' ? 1 : -1;

      draggingRef.current = true;
      mark('active');
      document.documentElement.classList.add('oo-resizing');
      document.documentElement.style.cursor = vertical ? 'ew-resize' : 'ns-resize';
      element.setPointerCapture(event.pointerId);

      const move = (moveEvent: globalThis.PointerEvent): void => {
        const pos = vertical ? moveEvent.clientX : moveEvent.clientY;
        pendingRef.current = clamp(startSize + sign * (pos - startPos), min, max);
        if (!scheduledRef.current) {
          scheduledRef.current = true;
          rafRef.current = requestAnimationFrame(() => commit(true));
        }
      };

      const end = (endEvent: globalThis.PointerEvent): void => {
        element.removeEventListener('pointermove', move);
        element.removeEventListener('pointerup', end);
        element.removeEventListener('pointercancel', end);
        if (rafRef.current !== null) {
          cancelAnimationFrame(rafRef.current);
          rafRef.current = null;
        }
        scheduledRef.current = false;
        // The settled write. Everything during the drag was transient, so
        // without this the size never reaches the store or storage.
        //
        // The fallback is the *live* size, not the size the drag started from:
        // by here the last transient frame has usually already been applied and
        // cleared `pending`, so starting over from `startSize` would end the
        // gesture by committing the width the user just spent it changing.
        pendingRef.current ??=
          scena.layout.get().surfaces[surface]?.size ?? startSize;
        commit(false);
        draggingRef.current = false;
        mark('idle');
        document.documentElement.classList.remove('oo-resizing');
        document.documentElement.style.cursor = '';
        if (element.hasPointerCapture(endEvent.pointerId)) {
          element.releasePointerCapture(endEvent.pointerId);
        }
      };

      // Listened on the element, not the document: the pointer is captured, so
      // every move is delivered here until release, and nothing else on the page
      // has to be told a drag is in progress.
      element.addEventListener('pointermove', move);
      element.addEventListener('pointerup', end);
      element.addEventListener('pointercancel', end);
    },
    [active, edge, grip, vertical, min, max, mark, commit, scena, surface],
  );

  if (!active) return { ref };
  return {
    ref,
    'data-resize': edge,
    onPointerMove,
    onPointerLeave,
    onPointerDown,
  };
}
