import {
  type CSSProperties,
  type DragEvent as ReactDragEvent,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
  useState,
} from 'react';
import type { LayoutProps } from '../../sdk/layout.js';
import { useScena } from '../../react/ScenaProvider.js';
import { ContextMenu } from '../menu/ContextMenu.js';
import { StackHeader } from './StackHeader.js';
import { MountTitle } from './MountTitle.js';
import { NAMED_GLYPH } from '../display/Icon.js';

// Vertical stack of mounts, each with a header that toggles collapsed.
// Headers are draggable for reorder (HTML5 DnD). Used primarily for
// sidebar:right multi-section panels.

const DRAG_MIME = 'application/x-scena-stack-index';

export function StackLayout({
  surface,
  mounts,
  state,
  setState,
  renderMount,
  onClose,
  onReorder,
}: LayoutProps) {
  const scena = useScena();
  // Merge persisted order with new mounts so a freshly opened section shows up
  // even if state.split.order was captured before it existed.
  const persistedOrder = state.split?.order ?? [];
  const orderSet = new Set(persistedOrder);
  const orderedKnown = persistedOrder
    .map((k) => mounts.find((m) => m.key === k))
    .filter((m): m is (typeof mounts)[number] => Boolean(m));
  const newMounts = mounts.filter((m) => !orderSet.has(m.key));
  // `allOrdered` is every mount in display order. `orderedMounts` is what
  // we actually render after applying the user's hide toggles (state.stack.hidden).
  // The `[...]` menu in the container strip operates on `allOrdered` so a
  // hidden mount remains togglable.
  const allOrdered = [...orderedKnown, ...newMounts];
  const hidden = new Set(state.stack?.hidden ?? []);
  const orderedMounts = allOrdered.filter((m) => !hidden.has(m.key));
  const container = state.stack?.container;

  const collapsed = new Set(state.split?.collapsed ?? []);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  function toggleCollapsed(key: string): void {
    const next = new Set(collapsed);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setState({
      split: {
        order: state.split?.order,
        ratios: state.split?.ratios,
        collapsed: [...next],
      },
    });
  }

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

  // ----- Context menu state -----
  // Per-section right-click → `tab:context`; container background right-click
  // → `surface:context`. Each section is a single mount so the per-section
  // [...] button is omitted (would duplicate the right-click items).
  const [sectionMenu, setSectionMenu] = useState<{ x: number; y: number; key: string; idx: number } | null>(null);
  const [bgMenu, setBgMenu] = useState<{ x: number; y: number } | null>(null);

  function onSectionContextMenu(
    e: ReactMouseEvent<HTMLDivElement>,
    key: string,
    idx: number,
  ): void {
    e.preventDefault();
    e.stopPropagation();
    setSectionMenu({ x: e.clientX, y: e.clientY, key, idx });
  }
  function onBgContextMenu(e: ReactMouseEvent<HTMLDivElement>): void {
    if (e.target !== e.currentTarget) return;
    e.preventDefault();
    setBgMenu({ x: e.clientX, y: e.clientY });
  }

  const baseContext = {
    '$/surface/name': surface,
    '$/surface/layoutId': 'stack',
    '$/surface/mountCount': mounts.length,
    '$/surface/closedHistory': 0,
    '$/tab/canSplit': false,
    '$/tab/canMove': mounts.length > 1,
    '$/group/canClose': false,
    '$/group/canMaximize': false,
  };

  const containerStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    minHeight: 0,
  };

  return (
    <div
      className="oo-layout oo-layout--stack"
      style={containerStyle}
      onContextMenu={onBgContextMenu}
    >
      <StackHeader
        title={container?.title ?? 'Details'}
        icon={container?.icon}
        color={container?.color}
        mounts={mounts}
        state={state}
        setState={setState}
      />

      {orderedMounts.map((mount, idx) => {
        const isCollapsed = collapsed.has(mount.key);
        // Per-field merge: mount.props ?? component.props ?? key.
        const compProps = scena.components.get(mount.component.component)?.props;
        const color = mount.props?.color ?? compProps?.color;
        return (
          <div
            key={mount.key}
            className="oo-stack-section"
            data-collapsed={isCollapsed}
            data-drag-over={dragOverIdx === idx}
            data-color={color}
            style={{
              flex: isCollapsed ? '0 0 auto' : 1,
              minHeight: 0,
              display: 'flex',
              flexDirection: 'column',
              borderBottom: '1px solid var(--oo-color-border)',
            }}
          >
            <div
              className="oo-stack-header"
              draggable
              onDragStart={(e) => onHeaderDragStart(e, idx)}
              onDragOver={(e) => onHeaderDragOver(e, idx)}
              onDragLeave={onHeaderDragLeave}
              onDrop={(e) => onHeaderDrop(e, idx)}
              onClick={() => toggleCollapsed(mount.key)}
              onContextMenu={(e) => onSectionContextMenu(e, mount.key, idx)}
              style={{
                cursor: 'grab',
                padding:
                  'var(--oo-spacing-xs) var(--oo-spacing-sm)',
                background: 'var(--oo-color-surface)',
                fontSize: 'var(--oo-font-size-xs)',
                textTransform: 'uppercase',
                color: 'var(--oo-color-muted)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                userSelect: 'none',
              }}
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <span aria-hidden>{isCollapsed ? '▶' : '▼'}</span>
                <MountTitle
                  mount={mount}
                  fallback={mount.key}
                  iconClassName="oo-stack-section__icon"
                  titleClassName="oo-stack-section__title"
                />
              </span>
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
            {!isCollapsed ? (
              <div style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
                {renderMount(mount) as ReactNode}
              </div>
            ) : null}
          </div>
        );
      })}

      {sectionMenu ? (
        <ContextMenu
          x={sectionMenu.x}
          y={sectionMenu.y}
          onClose={() => setSectionMenu(null)}
          spec={{ query: { slot: 'tab:context' }, footerHints: true }}
          context={{
            ...baseContext,
            '$/tab/key': sectionMenu.key,
            '$/tab/index': sectionMenu.idx,
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
