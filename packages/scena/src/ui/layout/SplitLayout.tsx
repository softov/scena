import {
  Fragment,
  type CSSProperties,
  type DragEvent as ReactDragEvent,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
  useRef,
  useState,
} from 'react';
import type { LayoutProps } from '../../types/layout.js';
import { useScena } from '../../react/ScenaProvider.js';
import { ContextMenu } from '../menu/ContextMenu.js';
import { MountTitle } from './MountTitle.js';
import { Divisor } from '../display/Divisor.js';
import { NAMED_GLYPH } from '../display/Icon.js';

// Side-by-side panes with a draggable divider between each adjacent pair AND
// a thin header per pane that acts as the drag handle for reorder (HTML5 DnD).
// Ratios sum to 1 and are stored in `state.split.ratios`. Dragging the divider
// at index i only adjusts ratios[i] and ratios[i+1] — the rest are preserved.

const MIN_PANE_RATIO = 0.05;
const DRAG_MIME = 'application/x-scena-split-index';

// ----- Layout -----

export function SplitLayout({
  surface,
  mounts,
  state,
  setState,
  renderMount,
  onClose,
  onReorder,
}: LayoutProps) {
  const scena = useScena();
  const containerRef = useRef<HTMLDivElement>(null);

  // Merge persisted order with new mounts so a freshly opened pane shows up
  // even if state.split.order was captured before it existed.
  const persistedOrder = state.split?.order ?? [];
  const orderSet = new Set(persistedOrder);
  const orderedKnown = persistedOrder
    .map((k) => mounts.find((m) => m.key === k))
    .filter((m): m is (typeof mounts)[number] => Boolean(m));
  const newMounts = mounts.filter((m) => !orderSet.has(m.key));
  const orderedMounts = [...orderedKnown, ...newMounts];

  const fallbackEqual = orderedMounts.length > 0 ? 1 / orderedMounts.length : 1;
  const ratios = (() => {
    const stored = state.split?.ratios;
    if (stored && stored.length === orderedMounts.length) return stored;
    return orderedMounts.map(() => fallbackEqual);
  })();

  function onDividerCommit(cumulativeRatio: number, id?: string | number): void {
    const index = id as number;
    if (orderedMounts.length < 2) return;
    const before = ratios.slice(0, index).reduce((a, b) => a + b, 0);
    const pair = (ratios[index] ?? 0) + (ratios[index + 1] ?? 0);
    if (pair <= 0) return;

    let newPaneI = clamp(cumulativeRatio - before, MIN_PANE_RATIO, pair - MIN_PANE_RATIO);
    let newPaneNext = pair - newPaneI;
    if (newPaneNext < MIN_PANE_RATIO) {
      newPaneNext = MIN_PANE_RATIO;
      newPaneI = pair - newPaneNext;
    }

    const next = [...ratios];
    next[index] = newPaneI;
    next[index + 1] = newPaneNext;
    setState({
      split: {
        order: state.split?.order,
        ratios: next,
        collapsed: state.split?.collapsed,
      },
    });
  }

  // ----- Drag-reorder via pane headers -----
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  // ----- Context menu state -----
  // Per-pane right-click → `tab:context`; gutter / container right-click →
  // `surface:context`. SplitLayout has no real "group" concept (each column
  // is one mount) so we don't expose a per-pane [...] button — surface-level
  // operations (close all, switch layout) live on the background menu.
  const [paneMenu, setPaneMenu] = useState<{ x: number; y: number; key: string; idx: number } | null>(null);
  const [bgMenu, setBgMenu] = useState<{ x: number; y: number } | null>(null);

  function onPaneContextMenu(
    e: ReactMouseEvent<HTMLDivElement>,
    key: string,
    idx: number,
  ): void {
    e.preventDefault();
    e.stopPropagation();
    setPaneMenu({ x: e.clientX, y: e.clientY, key, idx });
  }
  function onBgContextMenu(e: ReactMouseEvent<HTMLDivElement>): void {
    if (e.target !== e.currentTarget) return;
    e.preventDefault();
    setBgMenu({ x: e.clientX, y: e.clientY });
  }

  const baseContext = {
    '$/surface/name': surface,
    '$/surface/layoutId': 'split',
    '$/surface/mountCount': mounts.length,
    '$/surface/closedHistory': 0,
    '$/tab/canSplit': false,
    '$/tab/canMove': false,
    '$/group/canClose': false,
    '$/group/canMaximize': false,
  };

  function onHeaderDragStart(e: ReactDragEvent<HTMLDivElement>, idx: number) {
    e.dataTransfer.setData(DRAG_MIME, String(idx));
    e.dataTransfer.effectAllowed = 'move';
  }
  function onHeaderDragOver(e: ReactDragEvent<HTMLDivElement>, idx: number) {
    if (!e.dataTransfer.types.includes(DRAG_MIME)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIdx(idx);
  }
  function onHeaderDragLeave() {
    setDragOverIdx(null);
  }
  function onHeaderDrop(e: ReactDragEvent<HTMLDivElement>, toIdx: number) {
    if (!e.dataTransfer.types.includes(DRAG_MIME)) return;
    e.preventDefault();
    const fromIdx = Number(e.dataTransfer.getData(DRAG_MIME));
    setDragOverIdx(null);
    if (Number.isFinite(fromIdx) && fromIdx !== toIdx) {
      onReorder(fromIdx, toIdx);
    }
  }

  if (orderedMounts.length === 0) {
    return (
      <div style={{ padding: 24, color: 'var(--oo-color-muted)' }}>
        Nothing open.
      </div>
    );
  }

  const containerStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'row',
    height: '100%',
    minHeight: 0,
  };

  return (
    <div
      ref={containerRef}
      className="oo-layout oo-layout--split"
      style={containerStyle}
      onContextMenu={onBgContextMenu}
    >
      {orderedMounts.map((mount, i) => {
        // Per-field merge: mount.props ?? component.props ?? key.
        const compProps = scena.components.get(mount.component.component)?.props;
        const color = mount.props?.color ?? compProps?.color;
        return (
        <Fragment key={mount.key}>
          <div
            data-pane-index={i}
            data-drag-over={dragOverIdx === i}
            data-color={color}
            className="oo-split-pane"
            style={{
              flex: ratios[i] ?? fallbackEqual,
              minWidth: 0,
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div
              className="oo-split-pane-header"
              draggable
              onDragStart={(e) => onHeaderDragStart(e, i)}
              onDragOver={(e) => onHeaderDragOver(e, i)}
              onDragLeave={onHeaderDragLeave}
              onDrop={(e) => onHeaderDrop(e, i)}
              onContextMenu={(e) => onPaneContextMenu(e, mount.key, i)}
              style={{
                flex: '0 0 auto',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: 'var(--oo-spacing-xs) var(--oo-spacing-sm)',
                background: 'var(--oo-color-surface)',
                borderBottom: '1px solid var(--oo-color-border)',
                fontSize: 'var(--oo-font-size-xs)',
                color: 'var(--oo-color-muted)',
                cursor: 'grab',
                userSelect: 'none',
              }}
            >
              <MountTitle
                mount={mount}
                fallback={mount.key}
                iconClassName="oo-split-pane-header__icon"
                titleClassName="oo-split-pane-header__title"
              />
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  onClose(mount.key);
                }}
                title="Close"
                style={{ cursor: 'pointer' }}
              >
                {NAMED_GLYPH.closePanel}
              </span>
            </div>
            <div style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
              {renderMount(mount) as ReactNode}
            </div>
          </div>
          {i < orderedMounts.length - 1 ? (
            <Divisor
              id={i}
              direction="row"
              containerRef={containerRef}
              onCommit={onDividerCommit}
            />
          ) : null}
        </Fragment>
        );
      })}

      {paneMenu ? (
        <ContextMenu
          x={paneMenu.x}
          y={paneMenu.y}
          onClose={() => setPaneMenu(null)}
          spec={{ query: { slot: 'tab:context' }, footerHints: true }}
          context={{
            ...baseContext,
            '$/tab/key': paneMenu.key,
            '$/tab/index': paneMenu.idx,
            '$/tab/isActive': true,
            '$/tab/isPinned': false,
            '$/group/tabCount': mounts.length,
          }}
        />
      ) : null}

      {bgMenu ? (
        <ContextMenu
          x={bgMenu.x}
          y={bgMenu.y}
          onClose={() => setBgMenu(null)}
          spec={{ query: { slot: 'surface:context' }, footerHints: true }}
          context={baseContext}
        />
      ) : null}
    </div>
  );
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}
