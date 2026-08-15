import {
  type MouseEvent as ReactMouseEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type {
  LayoutProps,
  SpatialArrangement,
  SpatialBounds,
  SpatialViewport,
} from '../../types/layout.js';
import { useScena } from '../../react/ScenaProvider.js';
import { ContextMenu } from '../menu/ContextMenu.js';
import { CampusView } from '../campus/CampusView.js';
import type { CampusNodeTypes } from '../campus/CampusView.js';
import { CampusMappa } from '../campus/CampusMappa.js';
import type { CampusController, CampusMappaNode, CampusNode } from '../campus/types.js';
import { SpatialCard, type SpatialCardData } from './SpatialCard.js';
import { Toolbar } from '../navigation/Toolbar.js';

// Free-form positioning with three arrangement strategies:
//
//   cascade — staircase offsets per mount index (default)
//   grid    — auto-near-square; n=4 → 2x2, n=9 → 3x3, n=5 → 2/2/1, etc.
//   manual  — user-positioned (drag header to move, edges/corners resize).
//             Bounds persisted in state.spatial.bounds[mount.key].
//
// First user drag while in cascade/grid snapshots every mount's current
// bounds and switches to manual, so other mounts don't shift.
//
// SpatialLayout is now a mount-aware adapter over <CampusView>: it owns
// the arrangement strategy, selection, toolbar, context menus, and
// per-mount spatial commands. Pan/zoom/wheel/grid/drag live in Campus.

const CARD_DEFAULT_W = 960;
const CARD_DEFAULT_H = 768;
const CASCADE_STEP = 36;
const CASCADE_START = 40;
const GRID_MARGIN = 16;
const GRID_GAP = 16;

// World half-extent for the canvas. Hardcoded here because SpatialLayout
// doesn't take props from outside the layout registry; a future surface
// option could lift this into state.spatial.maxDepth. ±8000 world pixels
// is roughly 20× the default card size in each direction.
const MAX_DEPTH = 8000;

function computeInitialBounds(
  index: number,
  total: number,
  arrangement: SpatialArrangement,
): SpatialBounds {
  if (arrangement === 'grid' && total > 0) {
    const cols = Math.max(1, Math.floor(Math.sqrt(total)));
    const col = index % cols;
    const row = Math.floor(index / cols);
    return {
      x: GRID_MARGIN + col * (CARD_DEFAULT_W + GRID_GAP),
      y: GRID_MARGIN + row * (CARD_DEFAULT_H + GRID_GAP),
      w: CARD_DEFAULT_W,
      h: CARD_DEFAULT_H,
    };
  }
  return {
    x: CASCADE_START + index * CASCADE_STEP,
    y: CASCADE_START + index * CASCADE_STEP,
    w: CARD_DEFAULT_W,
    h: CARD_DEFAULT_H,
  };
}

const DEFAULT_VIEWPORT: SpatialViewport = { scale: 1, panX: 0, panY: 0 };
const ZOOM_STEP = 1.1;

// CampusView node registry. Spatial mounts all render as the `card` type.
const CARD_NODE_TYPES: CampusNodeTypes = { card: SpatialCard };

export function SpatialLayout({
  surface,
  mounts,
  state,
  setState,
  renderMount,
  onClose,
  onActivate,
}: LayoutProps) {
  const scena = useScena();

  // Background + per-card context menus.
  const [bgMenu, setBgMenu] = useState<{ x: number; y: number } | null>(null);
  const [cardMenu, setCardMenu] = useState<{ x: number; y: number; key: string } | null>(null);

  const arrangement = state.spatial?.arrangement ?? 'cascade';
  const savedBounds = state.spatial?.bounds ?? {};
  const selectedKey = state.spatial?.selectedKey;
  const viewport = state.spatial?.viewport ?? DEFAULT_VIEWPORT;

  // Single source of truth for ALL non-viewport spatial fields between
  // renders. CampusView owns viewport throttling internally, so we no
  // longer carry pendingViewportRef / rAF refs here. spatialRef still
  // matters for arrangement/bounds/selection updates that may fire in
  // quick succession (e.g. first-drag snapshot + bounds commit in one
  // tick) — without it the second commit would clobber the first.
  type SpatialState = {
    arrangement: SpatialArrangement;
    bounds: Record<string, SpatialBounds>;
    selectedKey?: string;
    viewport: SpatialViewport;
  };
  const spatialRef = useRef<SpatialState>({ arrangement, bounds: savedBounds, selectedKey, viewport });
  spatialRef.current = { arrangement, bounds: savedBounds, selectedKey, viewport };

  function applySpatial(patch: Partial<SpatialState>): void {
    const next: SpatialState = { ...spatialRef.current, ...patch };
    spatialRef.current = next;
    setState({ spatial: next });
  }

  // CampusView is fully controlled; its onViewportChange routes here.
  function onViewportChange(next: SpatialViewport): void {
    applySpatial({ viewport: next });
  }

  // Effective bounds: manual reads saved (with cascade fallback for fresh
  // mounts); cascade/grid recompute every render so adding a mount restacks.
  const effectiveBounds = useMemo(() => {
    const map: Record<string, SpatialBounds> = {};
    mounts.forEach((m, i) => {
      if (arrangement === 'manual') {
        map[m.key] = savedBounds[m.key] ?? computeInitialBounds(i, mounts.length, 'cascade');
      } else {
        map[m.key] = computeInitialBounds(i, mounts.length, arrangement);
      }
    });
    return map;
  }, [mounts, arrangement, savedBounds]);

  function setArrangement(next: SpatialArrangement): void {
    if (next === 'manual') {
      const snapshot: Record<string, SpatialBounds> = {};
      for (const m of mounts) snapshot[m.key] = effectiveBounds[m.key]!;
      applySpatial({ arrangement: 'manual', bounds: snapshot });
    } else {
      applySpatial({ arrangement: next, bounds: {} });
    }
  }

  function commitBoundsForMount(key: string, next: SpatialBounds): void {
    // First drag/resize while in cascade/grid → snapshot ALL mounts so
    // others don't shift when arrangement flips to manual.
    if (spatialRef.current.arrangement !== 'manual') {
      const snapshot: Record<string, SpatialBounds> = {};
      for (const m of mounts) snapshot[m.key] = effectiveBounds[m.key]!;
      snapshot[key] = next;
      applySpatial({ arrangement: 'manual', bounds: snapshot, selectedKey: key });
      return;
    }
    applySpatial({
      bounds: { ...spatialRef.current.bounds, [key]: next },
      selectedKey: key,
    });
  }

  function select(key: string | undefined): void {
    if (spatialRef.current.selectedKey === key) return;
    applySpatial({ selectedKey: key });
    if (key) onActivate(key);
  }

  // ----- Campus controller + spatial-only command handlers -----
  const campusRef = useRef<CampusController>(null);

  function fitToView(): void {
    if (mounts.length === 0) {
      campusRef.current?.fitToView();
      return;
    }
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const m of mounts) {
      const b = effectiveBounds[m.key];
      if (!b) continue;
      minX = Math.min(minX, b.x);
      minY = Math.min(minY, b.y);
      maxX = Math.max(maxX, b.x + b.w);
      maxY = Math.max(maxY, b.y + b.h);
    }
    if (!isFinite(minX)) return;
    campusRef.current?.fitToView({
      x: minX, y: minY, w: maxX - minX, h: maxY - minY,
    });
  }

  function centerOnSelected(): void {
    const key = selectedKey;
    if (!key) return;
    const b = effectiveBounds[key];
    if (!b) return;
    campusRef.current?.centerOn(b.x + b.w / 2, b.y + b.h / 2);
  }

  function centerOnCard(key: string): void {
    const b = effectiveBounds[key];
    if (!b) return;
    campusRef.current?.centerOn(b.x + b.w / 2, b.y + b.h / 2);
  }

  function resetBoundsForCard(key: string): void {
    const idx = mounts.findIndex((m) => m.key === key);
    if (idx < 0) return;
    commitBoundsForMount(key, computeInitialBounds(idx, mounts.length, 'cascade'));
  }

  // ----- Spatial-only commands (registered at mount; auto-disposed). -----
  // Imperative spatial actions can't be expressed as pure state writes
  // (they need DOM measurements). Registering them inside this layout via
  // handlersRef keeps closures current across renders.
  const handlersRef = useRef({
    fitToView,
    resetViewport: () => campusRef.current?.resetViewport(),
    centerOnSelected,
    setArrangement,
    centerOnCard,
    resetBoundsForCard,
  });
  handlersRef.current = {
    fitToView,
    resetViewport: () => campusRef.current?.resetViewport(),
    centerOnSelected,
    setArrangement,
    centerOnCard,
    resetBoundsForCard,
  };

  useEffect(() => {
    const subs = [
      scena.commands.register({
        id: 'surface.fitToView',
        title: 'Fit to view',
        description: 'Frame all cards',
        icon: '⛶',
        color: 'blue',
        slots: ['surface:context'],
        when: '$/surface/layoutId == "spatial"',
        run: (ctx) => {
          handlersRef.current.fitToView();
          ctx.host?.closeMenu();
        },
      }),
      scena.commands.register({
        id: 'surface.resetZoom',
        title: 'Reset zoom',
        icon: '↺',
        slots: ['surface:context'],
        when: '$/surface/layoutId == "spatial"',
        run: (ctx) => {
          handlersRef.current.resetViewport();
          ctx.host?.closeMenu();
        },
      }),
      scena.commands.register({
        id: 'surface.centerSelected',
        title: 'Center on selected',
        icon: '◎',
        color: 'teal',
        slots: ['surface:context'],
        when: '$/surface/layoutId == "spatial" && $/surface/hasSelection == true',
        run: (ctx) => {
          handlersRef.current.centerOnSelected();
          ctx.host?.closeMenu();
        },
      }),
      scena.commands.register({
        id: 'surface.setArrangement.cascade',
        title: 'Arrange: Cascade',
        icon: '▤',
        slots: ['surface:context'],
        when: '$/surface/layoutId == "spatial" && $/surface/arrangement != "cascade"',
        run: (ctx) => {
          handlersRef.current.setArrangement('cascade');
          ctx.host?.closeMenu();
        },
      }),
      scena.commands.register({
        id: 'surface.setArrangement.grid',
        title: 'Arrange: Grid',
        icon: '▦',
        color: 'violet',
        slots: ['surface:context'],
        when: '$/surface/layoutId == "spatial" && $/surface/arrangement != "grid"',
        run: (ctx) => {
          handlersRef.current.setArrangement('grid');
          ctx.host?.closeMenu();
        },
      }),
      scena.commands.register({
        id: 'surface.setArrangement.manual',
        title: 'Arrange: Manual',
        icon: '✥',
        slots: ['surface:context'],
        when: '$/surface/layoutId == "spatial" && $/surface/arrangement != "manual"',
        run: (ctx) => {
          handlersRef.current.setArrangement('manual');
          ctx.host?.closeMenu();
        },
      }),
      scena.commands.register({
        id: 'card.centerOn',
        title: 'Center on this card',
        icon: '◎',
        color: 'teal',
        slots: ['card:context'],
        when: '$/surface/layoutId == "spatial"',
        run: (ctx) => {
          const key = ctx.store.get<string>('$/tab/key');
          if (!key) return;
          handlersRef.current.centerOnCard(key);
          ctx.host?.closeMenu();
        },
      }),
      scena.commands.register({
        id: 'card.resetBounds',
        title: 'Reset bounds',
        description: 'Recompute size + position',
        icon: '↺',
        slots: ['card:context'],
        when: '$/surface/layoutId == "spatial"',
        run: (ctx) => {
          const key = ctx.store.get<string>('$/tab/key');
          if (!key) return;
          handlersRef.current.resetBoundsForCard(key);
          ctx.host?.closeMenu();
        },
      }),
    ];
    return () => {
      for (const s of subs) s.dispose();
    };
  }, [scena]);

  // CampusView nodes — one `card` per mount, positioned at its effective
  // bounds. Card-specific behavior (title/icon/close/body) rides on `data`;
  // CampusView owns drag/resize/select/context generically.
  const cardNodes = useMemo<CampusNode[]>(
    () =>
      mounts.map((mount) => ({
        id: mount.key,
        type: 'card',
        bounds: effectiveBounds[mount.key]!,
        selected: mount.key === selectedKey,
        data: {
          mount,
          renderMount,
          onClose: () => onClose(mount.key),
        } satisfies SpatialCardData,
      })),
    [mounts, effectiveBounds, selectedKey, renderMount, onClose],
  );

  // Minimap nodes — colored by the registered component's opens.color
  // so a "user" card lights up violet, a "file" blue, etc.
  const mappaNodes: CampusMappaNode[] = mounts.flatMap((m) => {
    const b = effectiveBounds[m.key];
    if (!b) return [];
    const def = scena.components.get(m.component.component);
    const color = def?.opens?.color as string | undefined;
    return [{ id: m.key, bounds: b, color, selected: m.key === selectedKey }];
  });

  function onContainerContextMenu(e: ReactMouseEvent<HTMLDivElement>): void {
    e.preventDefault();
    setBgMenu({ x: e.clientX, y: e.clientY });
  }

  if (mounts.length === 0) {
    return (
      <div style={{ padding: 24, color: 'var(--oo-color-muted)' }}>
        Nothing open.
      </div>
    );
  }

  return (
    <div
      className="oo-layout oo-layout--spatial"
      style={{ display: 'flex', flexDirection: 'column', height: '100%' }}
    >
      <Toolbar className="oo-spatial-toolbar">
        <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <span style={{ color: 'var(--oo-color-muted)' }}>arrange:</span>
          <select
            value={arrangement}
            onChange={(e) =>
              setArrangement(e.target.value as SpatialArrangement)
            }
          >
            <option value="cascade">cascade</option>
            <option value="grid">grid</option>
            <option value="manual">manual</option>
          </select>
        </label>
        <button
          type="button"
          onClick={() => campusRef.current?.zoomBy(1 / ZOOM_STEP)}
          title="Zoom out"
          aria-label="Zoom out"
        >−</button>
        <ZoomPercentInput
          value={viewport.scale}
          onCommit={(scale) => campusRef.current?.zoomToScale(scale)}
        />
        <button
          type="button"
          onClick={() => campusRef.current?.zoomBy(ZOOM_STEP)}
          title="Zoom in"
          aria-label="Zoom in"
        >+</button>
        <button type="button" onClick={fitToView} title="Fit all cards to viewport">
          Fit
        </button>
        <button type="button" onClick={() => campusRef.current?.resetViewport()} title="Reset zoom + pan">
          Reset
        </button>
        <span
          style={{
            color: 'var(--oo-color-muted)',
            fontSize: 'var(--oo-font-size-xs)',
          }}
        >
          drag header to move · drag edges to resize · ctrl+wheel zooms ·
          drag empty area to pan · first drag locks to <em>manual</em>
        </span>
      </Toolbar>

      <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
        <CampusView
          ref={campusRef}
          viewport={viewport}
          onViewportChange={onViewportChange}
          maxDepth={MAX_DEPTH}
          nodes={cardNodes}
          nodeTypes={CARD_NODE_TYPES}
          onNodeCommit={(key, next) => commitBoundsForMount(key, next)}
          onNodeSelect={(key) => select(key)}
          onNodeContextMenu={(key, e) =>
            setCardMenu({ x: e.clientX, y: e.clientY, key })
          }
          onBackgroundClick={() => select(undefined)}
          onBackgroundContextMenu={onContainerContextMenu}
        >
          <CampusMappa
            nodes={mappaNodes}
            onJumpTo={(worldX, worldY) => campusRef.current?.centerOn(worldX, worldY)}
          />
        </CampusView>
      </div>

      {selectedKey ? (
        <SelectionFooter
          selectedKey={selectedKey}
          onCenter={() => centerOnCard(selectedKey)}
          onReset={() => resetBoundsForCard(selectedKey)}
          onClose={() => onClose(selectedKey)}
          onDeselect={() => select(undefined)}
        />
      ) : null}

      {bgMenu ? (
        <ContextMenu
          x={bgMenu.x}
          y={bgMenu.y}
          onClose={() => setBgMenu(null)}
          spec={{ query: { slot: 'surface:context' }, footerHints: true }}
          context={{
            '$/surface/name': surface,
            '$/surface/layoutId': 'spatial',
            '$/surface/mountCount': mounts.length,
            '$/surface/closedHistory': 0,
            '$/surface/arrangement': arrangement,
            '$/surface/hasSelection': Boolean(selectedKey),
          }}
        />
      ) : null}

      {cardMenu ? (
        <ContextMenu
          x={cardMenu.x}
          y={cardMenu.y}
          onClose={() => setCardMenu(null)}
          spec={{ query: { slot: 'card:context' }, footerHints: true }}
          context={{
            '$/surface/name': surface,
            '$/surface/layoutId': 'spatial',
            '$/surface/mountCount': mounts.length,
            '$/surface/closedHistory': 0,
            '$/surface/arrangement': arrangement,
            '$/tab/key': cardMenu.key,
            '$/tab/index': mounts.findIndex((m) => m.key === cardMenu.key),
            '$/tab/canSplit': false,
            '$/tab/canMove': false,
            '$/tab/isActive': cardMenu.key === selectedKey,
            '$/tab/isPinned': false,
            '$/group/tabCount': mounts.length,
          }}
        />
      ) : null}
    </div>
  );
}

// Floating selection footer. Appears at bottom-center when a card is
// selected. Transparent translucent background; rounded pill of buttons.
interface SelectionFooterProps {
  selectedKey: string;
  onCenter: () => void;
  onReset: () => void;
  onClose: () => void;
  onDeselect: () => void;
}

function SelectionFooter({
  selectedKey,
  onCenter,
  onReset,
  onClose,
  onDeselect,
}: SelectionFooterProps) {
  return (
    <div
      className="oo-spatial-footer"
      role="toolbar"
      aria-label="Selected card actions"
      style={{
        position: 'absolute',
        bottom: 16,
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        padding: '6px 8px',
        background: 'rgba(20, 20, 24, 0.78)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        borderRadius: 9999,
        color: '#fff',
        fontSize: 'var(--oo-font-size-xs)',
        boxShadow: '0 6px 20px rgba(0, 0, 0, 0.32)',
        pointerEvents: 'auto',
        zIndex: 50,
      }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <span
        style={{
          padding: '0 8px',
          color: 'rgba(255, 255, 255, 0.65)',
          fontFamily: 'var(--oo-font-mono)',
          maxWidth: 180,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
        title={selectedKey}
      >
        {selectedKey}
      </span>
      <FooterButton icon="◎" label="Center on this card" onClick={onCenter} />
      <FooterButton icon="↺" label="Reset bounds" onClick={onReset} />
      <FooterButton icon="✕" label="Close" onClick={onClose} variant="danger" />
      <FooterButton icon="⊗" label="Deselect" onClick={onDeselect} />
    </div>
  );
}

function FooterButton({
  icon,
  label,
  onClick,
  variant,
}: {
  icon: string;
  label: string;
  onClick: () => void;
  variant?: 'danger';
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      style={{
        width: 28,
        height: 28,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: 'none',
        borderRadius: '50%',
        background: 'rgba(255, 255, 255, 0.08)',
        color: variant === 'danger' ? 'rgb(255, 130, 130)' : '#fff',
        cursor: 'pointer',
        font: 'inherit',
        lineHeight: 1,
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255, 255, 255, 0.18)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255, 255, 255, 0.08)';
      }}
    >
      {icon}
    </button>
  );
}

interface ZoomPercentInputProps {
  value: number;
  onCommit: (scale: number) => void;
}

function ZoomPercentInput({ value, onCommit }: ZoomPercentInputProps) {
  const percent = Math.round(value * 100);
  const [draft, setDraft] = useState<string>(`${percent}`);
  const [editing, setEditing] = useState(false);

  if (!editing && draft !== `${percent}`) {
    setDraft(`${percent}`);
  }

  function commit(): void {
    const n = parseInt(draft, 10);
    if (Number.isFinite(n) && n > 0) {
      onCommit(n / 100);
    } else {
      setDraft(`${percent}`);
    }
    setEditing(false);
  }

  return (
    <input
      type="text"
      inputMode="numeric"
      value={editing ? draft : `${percent}%`}
      onFocus={(e) => {
        setEditing(true);
        setDraft(`${percent}`);
        requestAnimationFrame(() => e.target.select?.());
      }}
      onChange={(e) => setDraft(e.target.value.replace(/[^\d]/g, ''))}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          (e.target as HTMLInputElement).blur();
        } else if (e.key === 'Escape') {
          e.preventDefault();
          setDraft(`${percent}`);
          setEditing(false);
          (e.target as HTMLInputElement).blur();
        }
      }}
      title="Zoom percent"
      aria-label="Zoom percent"
      style={{
        width: 56,
        textAlign: 'center',
        font: 'inherit',
        padding: '2px 4px',
        border: '1px solid var(--oo-color-border)',
        borderRadius: 'var(--oo-radius-sm, 4px)',
        background: 'var(--oo-color-canvas)',
        color: 'var(--oo-color-fg)',
      }}
    />
  );
}
