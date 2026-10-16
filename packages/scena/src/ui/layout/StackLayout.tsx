import {
  type CSSProperties,
  type DragEvent as ReactDragEvent,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
  Fragment,
  useRef,
  useState,
} from 'react';
import type { LayoutProps } from '../../sdk/layout.js';
import { useScena } from '../../react/ScenaProvider.js';
import { ContextMenu } from '../menu/ContextMenu.js';
import { StackHeader } from './StackHeader.js';
import { MountTitle } from './MountTitle.js';
import { NAMED_GLYPH } from '../display/Icon.js';
import { Divisor } from '../display/Divisor.js';
import { useI18n } from '../../react/hooks/useI18n.js';
import { HeaderAction } from './HeaderAction.js';
import { resolveLabel } from '../../sdk/label.js';
import { translate } from '../../core/i18n/registry.js';
import type { BindingPath } from '../../sdk/component-graph.js';

// Vertical stack of mounts, each with a header that toggles collapsed.
// Headers are draggable for reorder (HTML5 DnD). Used primarily for
// sidebar:right multi-section panels.

const DRAG_MIME = 'application/x-scena-stack-index';
// The least a divider drag leaves a pane: its header and a row or so.
const MIN_PANE_PX = 48;

export function StackLayout({
  surface,
  mounts,
  state,
  setState,
  renderMount,
  renderEmpty,
  onClose,
  onReorder,
}: LayoutProps) {
  const { t } = useI18n();
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
  const containerRef = useRef<HTMLDivElement>(null);
  const sectionRefs = useRef(new Map<string, HTMLDivElement>());

  // Sized once a divider was dragged with every open pane showing. A pane
  // opened or shown since has no size, and the stack falls back to shares.
  const open = orderedMounts.filter((m) => !collapsed.has(m.key));
  const sizes = state.stack?.sizes ?? {};
  const sized = open.length > 0 && open.every((m) => (sizes[m.key] ?? 0) > 0);

  // A divider between `upper` and `lower` was dropped at `ratio` of the stack.
  // Every open pane keeps the height it shows now; the two either side split
  // their joint height at the cursor.
  function onDividerCommit(ratio: number, upper: string, lower: string): void {
    const box = containerRef.current?.getBoundingClientRect();
    const top = sectionRefs.current.get(upper)?.getBoundingClientRect();
    const bottom = sectionRefs.current.get(lower)?.getBoundingClientRect();
    if (!box || !top || !bottom) return;
    const next: Record<string, number> = { ...sizes };
    for (const m of open) {
      const height = sectionRefs.current.get(m.key)?.getBoundingClientRect().height ?? 0;
      next[m.key] = Math.max(height, MIN_PANE_PX);
    }
    const joint = top.height + bottom.height;
    if (joint < 2 * MIN_PANE_PX) return;
    const cursor = box.top + ratio * box.height;
    const upperHeight = Math.min(Math.max(cursor - top.top, MIN_PANE_PX), joint - MIN_PANE_PX);
    next[upper] = upperHeight;
    next[lower] = joint - upperHeight;
    setState({ stack: { ...state.stack, sizes: next } });
  }

  function paneFlex(mount: (typeof mounts)[number], isCollapsed: boolean): CSSProperties {
    if (isCollapsed) return { flex: '0 0 auto' };
    if (sized) return { flex: `${sizes[mount.key]} 1 0px` };
    if (mount.policy.fitContent) return { flex: '0 1 auto', maxHeight: '50%' };
    return { flex: '1 1 0px' };
  }

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

  if (orderedMounts.length === 0) return (renderEmpty?.() ?? null) as ReactNode;

  return (
    <div
      ref={containerRef}
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
        // A pane's buttons, as a section header draws them: mount.props ?? component.props.
        const actions = mount.props?.actions ?? compProps?.actions ?? [];
        // A divider only between two open panes; the line under a folded one stays a border.
        const below = orderedMounts[idx + 1];
        const divided = !isCollapsed && below !== undefined && !collapsed.has(below.key);
        const fits = !sized && !isCollapsed && mount.policy.fitContent === true;
        return (
          <Fragment key={mount.key}>
            <div
              ref={(el) => {
                if (el) sectionRefs.current.set(mount.key, el);
                else sectionRefs.current.delete(mount.key);
              }}
              className="oo-stack-section"
              data-collapsed={isCollapsed}
              data-drag-over={dragOverIdx === idx}
              data-color={color}
              style={{
                ...paneFlex(mount, isCollapsed),
                minHeight: 0,
                display: 'flex',
                flexDirection: 'column',
                borderBottom: divided ? undefined : '1px solid var(--oo-color-border)',
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
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2 }}>
                  {actions.length > 0 ? (
                    // Its own clicks: a button press must not also fold the pane.
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2 }} onClick={(e) => e.stopPropagation()}>
                      {actions.map((a) => (
                        <HeaderAction
                          key={a.command}
                          action={a}
                          text={resolveLabel(a.label, { get: (p) => scena.store.get(p as BindingPath), translate })}
                          run={(command) => void scena.commands.execute(command)}
                        />
                      ))}
                    </span>
                  ) : null}
                  {mount.policy.closable === false ? null : (
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        onClose(mount.key);
                      }}
                      title={t('common/close', 'Close')}
                      style={{ cursor: 'pointer' }}
                    >
                      {NAMED_GLYPH.closePanel}
                    </span>
                  )}
                </span>
              </div>
              {!isCollapsed ? (
                // A pane sized to its content grows with it; the others fill their share.
                <div style={{ flex: fits ? '1 1 auto' : 1, overflow: 'auto', minHeight: 0 }}>
                  {renderMount(mount) as ReactNode}
                </div>
              ) : null}
            </div>
            {divided ? (
              <Divisor
                direction="col"
                containerRef={containerRef}
                min={0}
                max={1}
                onCommit={(ratio) => onDividerCommit(ratio, mount.key, below.key)}
              />
            ) : null}
          </Fragment>
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
