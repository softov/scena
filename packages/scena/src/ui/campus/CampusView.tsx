import {
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  type Ref,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import { CampusContext, useCampus, type CampusContextValue } from './context.js';
import { CampusNodus } from './CampusNodus.js';
import { CampusStratum } from './CampusStratum.js';
import { CampusVelum } from './CampusVelum.js';
import type {
  CampusBounds,
  CampusController,
  CampusLayerConfig,
  CampusNode,
  CampusNodeRenderProps,
  CampusViewport,
} from './types.js';

export type CampusNodeComponent = (props: CampusNodeRenderProps) => ReactNode;

// type → renderer map (xyflow's `nodeTypes`). Keyed by CampusNode.type.
export type CampusNodeTypes = Record<string, CampusNodeComponent>;

// Generic pan/zoom canvas. Owns the viewport math, wheel/pan/drag, the
// optional grid background, and a context descendants read for shared state.
//
// Viewport is owned imperatively for fluidity. `viewport` is the INITIAL +
// persisted value; while the user pans/zooms, CampusView mutates the world
// wrapper's transform DIRECTLY (no React re-render) and pushes the new value
// through a tiny internal store so only the grid + minimap redraw. The node
// subtree is never re-rendered by a pan. `onViewportChange` is called
// debounced, on settle, so layout state / urls persist without paying a
// store round-trip per frame. Imperative actions (fitToView, centerOn,
// resetViewport, zoom) are exposed via `ref` for a sibling toolbar.

export interface CampusViewProps {
  // Initial + persisted viewport. External changes (fit, reset, reload) are
  // applied; live pan/zoom is owned internally and reported back via
  // onViewportChange (debounced on settle).
  viewport: CampusViewport;
  onViewportChange(next: CampusViewport): void;

  // World half-extent in world pixels. Pan/zoom and child drag/resize clamp
  // to [-maxDepth, +maxDepth] on both axes. Use Infinity for an unbounded
  // canvas (default; preserves pre-Campus SpatialLayout behavior).
  maxDepth?: number;

  // Zoom range. Defaults match the prior SpatialLayout (0.1 – 4).
  minScale?: number;
  maxScale?: number;

  // Ctrl/Cmd+wheel zoom step factor. <1 inverts; defaults to 1.1.
  zoomStep?: number;

  // Background grid. World-aligned at GRID_STEP_WORLD; fades at extremes.
  showGrid?: boolean;

  // Fires when the user clicks on the empty canvas (not on a child node).
  // Useful for clearing selection.
  onBackgroundClick?(): void;
  // Fires for right-click on the empty canvas. The handler can call
  // `e.preventDefault()`/`stopPropagation()` to take over.
  onBackgroundContextMenu?(e: ReactMouseEvent<HTMLDivElement>): void;

  // ----- Data-driven node model (xyflow-style) -----
  // Nodes to render. Each is wrapped in a CampusNodus frame and its body is
  // rendered by nodeTypes[node.type].
  nodes?: CampusNode[];
  // type → renderer map.
  nodeTypes?: CampusNodeTypes;
  // Layer config keyed by layer name. Nodes are bucketed by `node.layer`;
  // missing/unknown layers fall into the default layer. Strata stack by
  // `index`. Omit entirely for a single implicit layer.
  nodeLayers?: Record<string, CampusLayerConfig>;
  // Layer for nodes without a (valid) `layer`. Defaults to the lowest-index
  // configured layer, or an implicit 'default' layer when none are configured.
  defaultLayer?: string;
  // Per-node interactions. The frame is generic; these route back to the
  // consumer by node id.
  onNodeCommit?(id: string, bounds: CampusBounds): void;
  onNodeSelect?(id: string): void;
  onNodeContextMenu?(id: string, e: ReactMouseEvent<HTMLDivElement>): void;

  className?: string;
  style?: CSSProperties;
  // Fixed HUD overlay rendered in front of all strata via CampusVelum — NOT
  // pan/zoom transformed. Minimaps, toolbars, selection footers go here.
  children?: ReactNode;

  // Imperative handle for parent. React 19 forwards `ref` automatically.
  ref?: Ref<CampusController>;
}

const DEFAULT_MIN_SCALE = 0.1;
const DEFAULT_MAX_SCALE = 4;
const DEFAULT_ZOOM_STEP = 1.1;
const PAN_DRAG_THRESHOLD_SQ = 9;
const FIT_PADDING = 0.95;
const GRID_STEP_WORLD = 40;
// Persist the live viewport this long after the last pan/zoom event. Keeps
// app state / urls in sync without a store write per frame.
const VIEWPORT_PERSIST_MS = 140;

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function transformOf(v: CampusViewport): string {
  return `translate(${v.panX}px, ${v.panY}px) scale(${v.scale})`;
}

// Constrain a viewport to the world bounds. When the world is wider than
// the container at the current scale the pan is clamped so the view sits
// fully inside the world; when the world is narrower the world is centered
// (pan = container_dim / 2 places world origin at the view center).
function clampViewport(
  v: CampusViewport,
  container: { w: number; h: number },
  maxDepth: number,
  minScale: number,
  maxScale: number,
): CampusViewport {
  const scale = clamp(v.scale, minScale, maxScale);
  if (!isFinite(maxDepth)) return { ...v, scale };
  let { panX, panY } = v;
  const worldHalfW = maxDepth * scale;
  const worldHalfH = maxDepth * scale;
  if (2 * worldHalfW >= container.w) {
    panX = clamp(panX, container.w - worldHalfW, worldHalfW);
  } else {
    panX = container.w / 2;
  }
  if (2 * worldHalfH >= container.h) {
    panY = clamp(panY, container.h - worldHalfH, worldHalfH);
  } else {
    panY = container.h / 2;
  }
  return { scale, panX, panY };
}

export function CampusView({
  viewport,
  onViewportChange,
  maxDepth = Infinity,
  minScale = DEFAULT_MIN_SCALE,
  maxScale = DEFAULT_MAX_SCALE,
  zoomStep = DEFAULT_ZOOM_STEP,
  showGrid = true,
  onBackgroundClick,
  onBackgroundContextMenu,
  nodes,
  nodeTypes,
  nodeLayers,
  defaultLayer,
  onNodeCommit,
  onNodeSelect,
  onNodeContextMenu,
  className,
  style,
  children,
  ref,
}: CampusViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const zoomStepRef = useRef<number>(zoomStep);
  const minScaleRef = useRef<number>(minScale);
  const maxScaleRef = useRef<number>(maxScale);
  const commitViewportThrottledRef = useRef<(v: CampusViewport) => void>(commitViewportThrottled);

  // Container size is shared via context so CampusMappa doesn't have to
  // remeasure independently. ResizeObserver keeps it fresh — important for
  // fit-to-view math after the surrounding shell resizes.
  const [container, setContainer] = useState<{ w: number; h: number }>({ w: 0, h: 0 });
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    function measure() {
      const r = el!.getBoundingClientRect();
      setContainer({ w: r.width, h: r.height });
    }
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // ----- Live viewport store -----
  // The single source of truth for the live viewport. Updated imperatively
  // (no setState) so a pan never re-renders the node subtree. Initialized
  // from the prop once; external prop changes are reconciled in an effect.
  const viewportRef = useRef<CampusViewport>(viewport);
  const listenersRef = useRef(new Set<() => void>());
  const subscribeViewport = useCallback((listener: () => void) => {
    listenersRef.current.add(listener);
    return () => {
      listenersRef.current.delete(listener);
    };
  }, []);
  function notify(): void {
    listenersRef.current.forEach((l) => l());
  }

  function applyWorldTransform(v: CampusViewport): void {
    const el = wrapperRef.current;
    if (el) el.style.transform = transformOf(v);
  }

  // Debounced persistence. onViewportChange may change identity each render,
  // so read it through a ref.
  const onViewportChangeRef = useRef(onViewportChange);
  onViewportChangeRef.current = onViewportChange;
  const persistTimerRef = useRef<number | null>(null);
  function schedulePersist(): void {
    if (persistTimerRef.current !== null) window.clearTimeout(persistTimerRef.current);
    persistTimerRef.current = window.setTimeout(() => {
      persistTimerRef.current = null;
      onViewportChangeRef.current(viewportRef.current);
    }, VIEWPORT_PERSIST_MS);
  }
  useEffect(
    () => () => {
      if (persistTimerRef.current !== null) window.clearTimeout(persistTimerRef.current);
    },
    [],
  );

  // External viewport changes (programmatic set from outside, persisted-state
  // reload). Ignore echoes of our own debounced writes (prop === live value),
  // otherwise re-seat the live viewport and redraw.
  useEffect(() => {
    const v = viewportRef.current;
    if (viewport.scale === v.scale && viewport.panX === v.panX && viewport.panY === v.panY) {
      return;
    }
    viewportRef.current = viewport;
    applyWorldTransform(viewport);
    notify();
  }, [viewport]);

  // rAF-coalesced viewport commit. A single wheel tick can fire dozens of
  // events; without coalescing each one would mutate the DOM separately.
  const pendingRef = useRef<CampusViewport | null>(null);
  const rafRef = useRef<number | null>(null);
  function commitViewport(v: CampusViewport): void {
    const clamped = clampViewport(v, container, maxDepth, minScale, maxScale);
    viewportRef.current = clamped;
    applyWorldTransform(clamped); // imperative: no React re-render
    notify(); // grid + minimap redraw (only)
    schedulePersist(); // app-state write, debounced on settle
  }
  function commitViewportThrottled(v: CampusViewport): void {
    pendingRef.current = v;
    if (rafRef.current === null) {
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        const next = pendingRef.current;
        pendingRef.current = null;
        if (next) commitViewport(next);
      });
    }
  }

  // ----- Wheel: ctrl/meta + wheel zooms around cursor, plain wheel pans.
  // Native listener (not React's onWheel) so we can preventDefault — React's
  // synthetic wheel is passive and won't suppress the page scroll.
  useEffect(() => {
    zoomStepRef.current = zoomStep;
    minScaleRef.current = minScale;
    maxScaleRef.current = maxScale;
    commitViewportThrottledRef.current = commitViewportThrottled;
    // No dependency array on purpose. This syncs the latest values into refs
    // that the native wheel listener reads without re-subscribing, so it must
    // run on every render. `commitViewportThrottled` is redeclared each render,
    // so the previous array was already "every render" spelled out the long way.
  });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    function onWheel(e: WheelEvent) {
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const v = viewportRef.current;

      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();

        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const factor =
          e.deltaY < 0
            ? zoomStepRef.current
            : 1 / zoomStepRef.current;

        const newScale = clamp(
          v.scale * factor,
          minScaleRef.current,
          maxScaleRef.current
        );

        const worldX = (mouseX - v.panX) / v.scale;
        const worldY = (mouseY - v.panY) / v.scale;

        commitViewportThrottledRef.current({
          scale: newScale,
          panX: mouseX - worldX * newScale,
          panY: mouseY - worldY * newScale,
        });
      } else {
        e.preventDefault();

        const dx = -(e.shiftKey ? e.deltaY : e.deltaX);
        const dy = -(e.shiftKey ? 0 : e.deltaY);

        commitViewportThrottledRef.current({
          scale: v.scale,
          panX: v.panX + dx,
          panY: v.panY + dy,
        });
      }
    }

    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  // ----- Background pan drag -----
  const panDragRef = useRef<{
    startX: number;
    startY: number;
    startPanX: number;
    startPanY: number;
    moved: boolean;
  } | null>(null);

  function isBackgroundTarget(target: EventTarget | null): boolean {
    return target === containerRef.current || target === wrapperRef.current;
  }

  function onContainerPointerDown(e: ReactPointerEvent<HTMLDivElement>): void {
    if (!isBackgroundTarget(e.target)) return;
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    const v = viewportRef.current;
    panDragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startPanX: v.panX,
      startPanY: v.panY,
      moved: false,
    };
  }
  function onContainerPointerMove(e: ReactPointerEvent<HTMLDivElement>): void {
    const p = panDragRef.current;
    if (!p) return;
    const dx = e.clientX - p.startX;
    const dy = e.clientY - p.startY;
    if (!p.moved && dx * dx + dy * dy < PAN_DRAG_THRESHOLD_SQ) return;
    if (!p.moved && containerRef.current) {
      // Cursor is set imperatively: pan doesn't re-render so a style-prop
      // wouldn't update.
      containerRef.current.style.cursor = 'grabbing';
    }
    p.moved = true;
    commitViewportThrottled({
      scale: viewportRef.current.scale,
      panX: p.startPanX + dx,
      panY: p.startPanY + dy,
    });
  }
  function onContainerPointerUp(e: ReactPointerEvent<HTMLDivElement>): void {
    const p = panDragRef.current;
    if (!p) return;
    (e.currentTarget as Element).releasePointerCapture(e.pointerId);
    panDragRef.current = null;
    if (containerRef.current) containerRef.current.style.cursor = '';
    if (!p.moved) onBackgroundClick?.();
  }

  // ----- Background right-click -----
  function onContainerContextMenu(e: ReactMouseEvent<HTMLDivElement>): void {
    if (!isBackgroundTarget(e.target)) return;
    onBackgroundContextMenu?.(e);
  }

  // ----- Imperative controller (consumed via ref) -----
  useImperativeHandle(
    ref,
    (): CampusController => ({
      fitToView(bounds?: CampusBounds) {
        const c = container;
        if (c.w === 0 || c.h === 0) return;
        // Default fit target: the full world box. Consumers usually pass
        // the union of their node bounds (so empty space at the edges is
        // ignored even when the world itself is bounded).
        const target: CampusBounds = bounds ?? (isFinite(maxDepth)
          ? { x: -maxDepth, y: -maxDepth, w: 2 * maxDepth, h: 2 * maxDepth }
          : { x: 0, y: 0, w: 0, h: 0 });
        if (target.w <= 0 || target.h <= 0) return;
        const scale = clamp(
          Math.min(c.w / target.w, c.h / target.h) * FIT_PADDING,
          minScale,
          maxScale,
        );
        const worldCx = target.x + target.w / 2;
        const worldCy = target.y + target.h / 2;
        commitViewport({
          scale,
          panX: c.w / 2 - worldCx * scale,
          panY: c.h / 2 - worldCy * scale,
        });
      },
      centerOn(worldX: number, worldY: number) {
        const c = container;
        const v = viewportRef.current;
        if (c.w === 0 || c.h === 0) return;
        commitViewport({
          scale: v.scale,
          panX: c.w / 2 - worldX * v.scale,
          panY: c.h / 2 - worldY * v.scale,
        });
      },
      resetViewport() {
        commitViewport({ scale: 1, panX: 0, panY: 0 });
      },
      zoomBy(factor: number) {
        zoomAroundCenter(viewportRef.current.scale * factor);
      },
      zoomToScale(scale: number) {
        zoomAroundCenter(scale);
      },
    }),
    // The handle captures `container` and `maxDepth` so it must re-build
    // when those change; everything else flows through refs.
    //
    // `commitViewport` and `zoomAroundCenter` are intentionally absent. They
    // read only container/maxDepth/minScale/maxScale plus refs, and all four
    // are listed here — so the captured closures are never stale. Listing the
    // functions themselves would rebuild the handle on every render, since
    // they are redeclared each time, defeating the memo and forcing every
    // consumer holding the ref to re-run.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [container, maxDepth, minScale, maxScale],
  );

  function zoomAroundCenter(rawScale: number): void {
    const c = container;
    if (c.w === 0 || c.h === 0) return;
    const v = viewportRef.current;
    const next = clamp(rawScale, minScale, maxScale);
    if (next === v.scale) return;
    const cx = c.w / 2;
    const cy = c.h / 2;
    const worldX = (cx - v.panX) / v.scale;
    const worldY = (cy - v.panY) / v.scale;
    commitViewport({
      scale: next,
      panX: cx - worldX * next,
      panY: cy - worldY * next,
    });
  }

  // Bucket nodes into ordered strata. Configured layers come first sorted by
  // `index`; any layer referenced by a node but not configured (including the
  // implicit default) is appended after them. Each stratum carries its node
  // list so the render is a flat strata→nodes walk.
  const strata = useMemo(() => {
    const configured = Object.entries(nodeLayers ?? {})
      .map(([name, config]) => ({ name, config }))
      .sort((a, b) => a.config.index - b.config.index);
    const fallback = defaultLayer ?? configured[0]?.name ?? 'default';

    const buckets = new Map<string, CampusNode[]>();
    for (const node of nodes ?? []) {
      const layer = node.layer && nodeLayers?.[node.layer] ? node.layer : fallback;
      const bucket = buckets.get(layer);
      if (bucket) bucket.push(node);
      else buckets.set(layer, [node]);
    }

    const result: { name: string; config: CampusLayerConfig; nodes: CampusNode[] }[] = [];
    const seen = new Set<string>();
    for (const { name, config } of configured) {
      result.push({ name, config, nodes: buckets.get(name) ?? [] });
      seen.add(name);
    }
    for (const [name, layerNodes] of buckets) {
      if (seen.has(name)) continue;
      result.push({ name, config: { index: result.length }, nodes: layerNodes });
    }
    return result;
  }, [nodes, nodeLayers, defaultLayer]);

  // Context is intentionally free of the live viewport so node re-renders
  // don't track pan/zoom. It changes only on container/maxDepth.
  const ctxValue: CampusContextValue = useMemo(
    () => ({ viewportRef, subscribeViewport, container, maxDepth }),
    [subscribeViewport, container, maxDepth],
  );

  return (
    <CampusContext.Provider value={ctxValue}>
      <div
        ref={containerRef}
        className={['oo-campus', className].filter(Boolean).join(' ')}
        onPointerDown={onContainerPointerDown}
        onPointerMove={onContainerPointerMove}
        onPointerUp={onContainerPointerUp}
        onContextMenu={onContainerContextMenu}
        style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          overflow: 'hidden',
          background: 'var(--oo-color-surface)',
          touchAction: 'none',
          cursor: 'default',
          ...style,
        }}
      >
        {showGrid ? <CampusGrid /> : null}
        <div
          ref={wrapperRef}
          className="oo-campus-world"
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: 0,
            height: 0,
            // Initial transform; live updates are imperative (applyWorldTransform).
            transform: transformOf(viewportRef.current),
            transformOrigin: '0 0',
          }}
        >
          {strata.map((stratum) => (
            <CampusStratum
              key={stratum.name}
              zoom={stratum.config.zoom}
              pan={stratum.config.pan}
              zIndex={stratum.config.index}
            >
              {stratum.nodes.map((node) => {
                const Renderer = nodeTypes?.[node.type];
                if (!Renderer) return null;
                return (
                  <CampusNodusFrame
                    key={node.id}
                    node={node}
                    onCommit={onNodeCommit}
                    onSelect={onNodeSelect}
                    onContextMenu={onNodeContextMenu}
                  >
                    <Renderer
                      id={node.id}
                      selected={Boolean(node.selected)}
                      data={node.data}
                    />
                  </CampusNodusFrame>
                );
              })}
            </CampusStratum>
          ))}
        </div>
        <CampusVelum>{children}</CampusVelum>
      </div>
    </CampusContext.Provider>
  );
}

// A single node frame: wires CampusNode bounds/selection to a CampusNodus and
// routes drag/select/context events back to the consumer by id. Split out so
// the per-node event closures don't all re-create on every CampusView render.
interface CampusNodusFrameProps {
  node: CampusNode;
  onCommit?(id: string, bounds: CampusBounds): void;
  onSelect?(id: string): void;
  onContextMenu?(id: string, e: ReactMouseEvent<HTMLDivElement>): void;
  children: ReactNode;
}

function CampusNodusFrame({
  node,
  onCommit,
  onSelect,
  onContextMenu,
  children,
}: CampusNodusFrameProps) {
  return (
    <CampusNodus
      bounds={node.bounds}
      selected={node.selected}
      resizable={node.resizable}
      movable={node.movable}
      onCommit={(next) => onCommit?.(node.id, next)}
      onPointerDownCapture={() => {
        if (!node.selected) onSelect?.(node.id);
      }}
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onSelect?.(node.id);
        onContextMenu?.(node.id, e);
      }}
    >
      {children}
    </CampusNodus>
  );
}

// Faint world-space grid background. Two repeating linear gradients (h + v),
// pinned to the world origin via background-position so the lines stay on
// integer world coords as the user pans/zooms. Opacity fades at very low
// zooms (cells smaller than ~6px) and very high zooms (cells filling the
// viewport) to avoid visual noise.
//
// Subscribes to the viewport store directly so it redraws on pan/zoom without
// CampusView (and therefore the node subtree) re-rendering.
function CampusGrid() {
  const { viewportRef, subscribeViewport } = useCampus();
  const { panX, panY, scale } = useSyncExternalStore(
    subscribeViewport,
    () => viewportRef.current,
  );
  const step = GRID_STEP_WORLD * scale;
  const opacity = step < 6 ? 0 : step > 200 ? 0.04 : Math.min(0.12, step / 200);
  if (opacity <= 0) return null;
  const offX = ((panX % step) + step) % step;
  const offY = ((panY % step) + step) % step;
  const stroke = `rgba(128, 128, 128, ${opacity})`;
  return (
    <div
      className="oo-campus-grid"
      aria-hidden
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        backgroundImage:
          `linear-gradient(to right, ${stroke} 1px, transparent 1px),` +
          `linear-gradient(to bottom, ${stroke} 1px, transparent 1px)`,
        backgroundSize: `${step}px ${step}px, ${step}px ${step}px`,
        backgroundPosition: `${offX}px ${offY}px, ${offX}px ${offY}px`,
      }}
    />
  );
}
