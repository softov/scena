import {
  type CSSProperties,
  type DragEvent as ReactDragEvent,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from 'react';
import type {
  LayoutProps,
  TabPanelLeaf,
  TabPanelNode,
  TabPanelSplit,
} from '../../sdk/layout.js';
import type { ResolvedMount } from '../../sdk/mount-surface.js';
import {
  collectLeaves,
  mapLeaves,
  placeTab,
  reconcile,
  replaceSplit,
  splitAt,
  treesEqual,
  type TabPanelDropZone,
} from '../../sdk/tab-panel.js';
import { readTabDrag, TAB_DRAG_MIME, type TabDragPayload, writeTabDrag } from '../../sdk/tab-drag.js';
import { canTakeTab, currentTabDrag, endTabDrag, moveTabHere, startTabDrag } from '../../react/surface-drop.js';
import { droppedAt, endedOutside, openTabWindow } from '../../runtime/open-tab-window.js';
import { useScena } from '../../react/ScenaProvider.js';
import { useOwnerDocument } from '../../react/OwnerDocument.js';
import { ContextMenu } from '../menu/ContextMenu.js';
import { Divisor } from '../display/Divisor.js';
import { resolveColorRgb } from '../../sdk/colors.js';
import { NAMED_GLYPH } from '../display/Icon.js';
import { useStoreLabel } from '../../react/hooks/useStoreLabel.js';
import { useI18n } from '../../react/hooks/useI18n.js';

// Multi-group tabs. Recursive binary tree: a leaf is one Tab strip; a split
// holds two children with a draggable divider. Drag a tab onto another
// leaf's 5 zones to either join (center) or split (top/right/bottom/left).
// Each leaf has a top-right [...] menu for group-level actions.

const DRAG_MIME = 'application/x-scena-tab-panel';
const EDGE_THRESHOLD = 0.2;
const MIN_RATIO = 0.05;

// ----- Components -----

type DropZone = TabPanelDropZone;

interface DragPayload {
  sourceLeafId: string;
  tabKey: string;
}

interface TabPanelContext {
  surface: string;
  mounts: ResolvedMount[];
  renderMount: (m: ResolvedMount) => unknown;
  // The surface's empty view, shown when the surface holds no tab at all.
  renderEmpty?: () => unknown;
  onActivate: (key: string) => void;
  onClose: (key: string) => void;
  commit: (tree: TabPanelNode) => void;
  tree: TabPanelNode;
  leafCount: number;
  // Surface-wide pinned tab keys. Layouts read this to swap × for a pin
  // icon on pinned tabs; the right-click context-injection uses it so
  // tab.pin / tab.unpin gate correctly.
  pinned: Set<string>;
}

// Renders one leaf: tab strip + group menu + active mount + drop overlay.
function GroupPanel({ leaf, ctx }: { leaf: TabPanelLeaf; ctx: TabPanelContext }) {
  const { t } = useI18n();
  const scena = useScena();
  const { window: ownerWin } = useOwnerDocument();
  const activeKey = leaf.activeKey ?? leaf.tabs[0];
  // const activeMount = ctx.mounts.find((m) => m.key === activeKey);

  const [dragOverTab, setDragOverTab] = useState<number | null>(null);
  const [zone, setZone] = useState<DropZone | null>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const tabsRef = useRef<HTMLDivElement>(null);

  // Vertical wheel → horizontal scroll on the leaf's tab strip. Native
  // listener (not React's onWheel) so we can preventDefault — React's
  // synthetic wheel is passive and would scroll the surrounding page
  // vertically instead. Same pattern as packages/web's TabBar.
  useEffect(() => {
    const el = tabsRef.current;
    if (!el) return;
    function onWheel(e: WheelEvent) {
      if (e.deltaY === 0) return;
      e.preventDefault();
      el!.scrollLeft += e.deltaY;
    }
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  // Drop-preview cleanup. Two HTML5 DnD quirks bite here:
  //   1) `dragleave` fires when the cursor enters a CHILD of the body
  //      (the child becomes the new target), but we only want to clear when
  //      the cursor actually leaves the body's bounds.
  //   2) When the user releases the mouse OR the drag ends on a different
  //      element entirely, no `dragleave` may fire on this body at all —
  //      so its `zone` state would persist across drags.
  // The window listeners below guarantee zone clears on every drag end/drop
  // regardless of where it happened.
  useEffect(() => {
    const clearAll = (): void => {
      setZone(null);
      setDragOverTab(null);
    };
    ownerWin.addEventListener('dragend', clearAll);
    ownerWin.addEventListener('drop', clearAll);
    return () => {
      ownerWin.removeEventListener('dragend', clearAll);
      ownerWin.removeEventListener('drop', clearAll);
    };
  }, [ownerWin]);

  function setLeafActive(key: string) {
    const next = mapLeaves(ctx.tree, (l) =>
      l.id === leaf.id ? { ...l, activeKey: key } : l,
    );
    if (next) ctx.commit(next);
    ctx.onActivate(key);
  }

  // ----- Tab DnD source -----
  function onTabDragStart(e: ReactDragEvent<HTMLDivElement>, tabKey: string) {
    const payload: DragPayload = { sourceLeafId: leaf.id, tabKey };
    e.dataTransfer.setData(DRAG_MIME, JSON.stringify(payload));
    const shared: TabDragPayload = { surface: ctx.surface, key: tabKey, leafId: leaf.id };
    writeTabDrag(e.dataTransfer, shared);
    startTabDrag(shared);
    e.dataTransfer.effectAllowed = 'move';
  }

  // A tab dropped outside the browser window, where no surface took it, opens
  // in a window of its own at the drop point.
  function onTabDragEnd(e: ReactDragEvent<HTMLDivElement>, tabKey: string) {
    endTabDrag();
    if (!endedOutside(ownerWin, e)) return;
    openTabWindow(scena, tabKey, droppedAt(ownerWin, e.screenX, e.screenY));
  }

  // ----- Tab-strip drop (reorder within strip OR move into this leaf) -----
  // A tab from this surface carries the layout's own type; a tab from
  // another surface carries the shared one, and may be refused by its policy.
  // A refused drag gets `dropEffect: none` and no preventDefault, so the
  // browser shows it cannot land and no drop fires.
  function takesDrag(e: ReactDragEvent<HTMLDivElement>): boolean {
    const types = e.dataTransfer.types;
    const drag = currentTabDrag();
    if (drag && drag.surface !== ctx.surface && types.includes(TAB_DRAG_MIME)) {
      if (canTakeTab(scena, drag, ctx.surface)) return true;
      e.dataTransfer.dropEffect = 'none';
      return false;
    }
    return types.includes(DRAG_MIME);
  }

  // The shared payload of a drop from another surface, or null for a drop
  // from this one.
  function foreignDrop(e: ReactDragEvent<HTMLDivElement>): TabDragPayload | null {
    const shared = readTabDrag(e.dataTransfer);
    return shared && shared.surface !== ctx.surface ? shared : null;
  }

  function onTabStripDragOver(
    e: ReactDragEvent<HTMLDivElement>,
    idx: number,
  ) {
    if (!takesDrag(e)) return;
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    setDragOverTab(idx);
  }
  function onTabStripDragLeave() {
    setDragOverTab(null);
  }
  function onTabStripDrop(
    e: ReactDragEvent<HTMLDivElement>,
    toIdx: number,
  ) {
    if (!takesDrag(e)) return;
    e.preventDefault();
    e.stopPropagation();
    setDragOverTab(null);
    const foreign = foreignDrop(e);
    if (foreign) {
      moveTabHere(scena, foreign, ctx.surface, () => {
        const tree = placeTab(ctx.tree, foreign.key, leaf.id, toIdx);
        return tree ? { tabPanel: { tree } } : null;
      });
      return;
    }
    const payload = readPayload(e);
    if (!payload) return;
    insertTab(ctx, payload, leaf.id, toIdx);
  }

  // ----- Body 5-zone drop -----
  function computeZone(e: ReactDragEvent<HTMLDivElement>): DropZone | null {
    const el = bodyRef.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return null;
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    if (y < EDGE_THRESHOLD) return 'top';
    if (y > 1 - EDGE_THRESHOLD) return 'bottom';
    if (x < EDGE_THRESHOLD) return 'left';
    if (x > 1 - EDGE_THRESHOLD) return 'right';
    return 'center';
  }
  function onBodyDragOver(e: ReactDragEvent<HTMLDivElement>) {
    if (!takesDrag(e)) {
      setZone(null);
      return;
    }
    e.stopPropagation();
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setZone(computeZone(e));
  }
  function onBodyDragLeave(e: ReactDragEvent<HTMLDivElement>) {
    // Clear only when the cursor leaves the body entirely. `relatedTarget`
    // is the element being entered (if any) — if it's inside the body we're
    // still inside; only clear when it's outside or null (left the window).
    const next = e.relatedTarget as Node | null;
    if (!next || !(e.currentTarget as Node).contains(next)) {
      setZone(null);
    }
  }
  function onBodyDrop(e: ReactDragEvent<HTMLDivElement>) {
    if (!takesDrag(e)) return;
    e.preventDefault();
    e.stopPropagation();
    const z = computeZone(e);
    setZone(null);
    const foreign = foreignDrop(e);
    if (foreign && z) {
      moveTabHere(scena, foreign, ctx.surface, () => {
        const tree = z === 'center'
          ? placeTab(ctx.tree, foreign.key, leaf.id, leaf.tabs.length)
          : splitAt(ctx.tree, foreign.key, leaf.id, z);
        return tree ? { tabPanel: { tree } } : null;
      });
      return;
    }
    const payload = readPayload(e);
    if (!payload || !z) return;
    if (z === 'center') {
      insertTab(ctx, payload, leaf.id, leaf.tabs.length);
    } else {
      splitLeafOnDrop(ctx, payload, leaf.id, z);
    }
  }

  // ----- [...] group menu -----
  // Items come from the `tab-group:context` slot. Layout-commands.ts (group.*)
  // owns the actions; this menu just opens the picker with the right
  // capability paths injected so the commands target this leaf.
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);
  function openGroupMenu(e: ReactMouseEvent<HTMLButtonElement>) {
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLButtonElement).getBoundingClientRect();
    setMenu({ x: rect.right - 4, y: rect.bottom + 2 });
  }
  function closeMenu() {
    setMenu(null);
  }

  // ----- Per-tab context menu (right-click on tab) -----
  const [tabMenu, setTabMenu] = useState<{
    x: number;
    y: number;
    tabKey: string;
    tabIdx: number;
  } | null>(null);
  function openTabMenu(
    e: ReactMouseEvent<HTMLDivElement>,
    tabKey: string,
    tabIdx: number,
  ) {
    e.preventDefault();
    setTabMenu({ x: e.clientX, y: e.clientY, tabKey, tabIdx });
  }
  function closeTabMenu() {
    setTabMenu(null);
  }

  // Host-contributed rows for the right-clicked tab (e.g. explorer's "Open
  // with <viewer>" alternates). Empty for tabs no host claims.
  const tabMenuMount = tabMenu
    ? ctx.mounts.find((m) => m.key === tabMenu.tabKey)
    : undefined;
  const tabMenuExtra = tabMenuMount
    ? scena.mountMenus.collect('tab:context', tabMenuMount)
    : undefined;

  return (
    <div
      className="oo-tab-panel-group"
      data-leaf-id={leaf.id}
      style={{
        flex: 1,
        minWidth: 0,
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <div className="tab-bar">
        <div className="tab-bar__strip" ref={tabsRef}>
          {leaf.tabs.map((key, ti) => {
            const m = ctx.mounts.find((mm) => mm.key === key);
            return <TabTitle
              key={key}
              resourceKey={key}
              idx={ti}
              m={m}
              isActive={key === activeKey}
              isPinned={ctx.pinned.has(key)}
              dragOverTab={dragOverTab}
              onDragStart={(e) => onTabDragStart(e, key)}
              onDragEnd={(e) => onTabDragEnd(e, key)}
              onDragOver={(e) => onTabStripDragOver(e, ti)}
              onDragLeave={onTabStripDragLeave}
              onDrop={(e) => onTabStripDrop(e, ti)}
              onClick={() => setLeafActive(key)}
              onContextMenu={(e) => openTabMenu(e, key, ti)}
              onClose={() => ctx.onClose(key)}
              onUnpin={(e) => {
                e.stopPropagation();
                scena.store.set('$/tab/key', key);
                scena.store.set('$/surface/name', ctx.surface);
                void scena.commands.execute('tab.unpin');
              }}
            />;
          })}
        </div>
        <div className="tab-bar__extras">
          <button
            className="tab-bar__more"
            title={t('layout/groupActions', 'Group actions')}
            aria-label={t('layout/groupActions', 'Group actions')}
            onClick={openGroupMenu}
          >{NAMED_GLYPH.moreHoriz}</button>
        </div>
      </div>

      <div
        ref={bodyRef}
        onDragOver={onBodyDragOver}
        onDragLeave={onBodyDragLeave}
        onDrop={onBodyDrop}
        style={{
          flex: 1,
          minHeight: 0,
          position: 'relative',
          overflow: 'auto',
        }}
      >
        {leaf.tabs.length === 0 ? (
          // No tab anywhere: the surface's empty view. An empty group beside
          // others is one a split made on purpose, and waits for a tab.
          ctx.mounts.length === 0 ? (
            (ctx.renderEmpty?.() ?? null) as ReactNode
          ) : (
            <div style={{ padding: 24, color: 'var(--oo-color-muted)' }}>
              Empty group. Drag a tab here.
            </div>
          )
        ) : (
          // Keep every tab in the group mounted; show only the active one.
          // Rendering just the active mount unmounts the rest, losing state.
          leaf.tabs.map((key) => {
            const m = ctx.mounts.find((mm) => mm.key === key);
            if (!m) return null;
            return (
              <div
                key={key}
                className="oo-layout__mount"
                data-active={key === activeKey || undefined}
                style={{ position: 'absolute', inset: 0, overflow: 'auto', display: key === activeKey ? 'block' : 'none' }}
              >
                {ctx.renderMount(m) as ReactNode}
              </div>
            );
          })
        )}
        {zone ? <DropPreview zone={zone} /> : null}
      </div>

      {menu ? (
        <ContextMenu
          x={menu.x}
          y={menu.y}
          onClose={closeMenu}
          spec={{ query: { slot: 'tab-group:context' }, footerHints: true }}
          context={{
            '$/surface/name': ctx.surface,
            '$/surface/layoutId': 'tab-panel',
            '$/surface/mountCount': ctx.mounts.length,
            '$/surface/closedHistory': 0,
            '$/group/key': leaf.id,
            '$/group/tabCount': leaf.tabs.length,
            '$/group/canClose': true,
            '$/group/canMaximize': false,
            '$/tab/canSplit': true,
            '$/tab/canMove': ctx.leafCount > 1,
          }}
        />
      ) : null}

      {tabMenu ? (
        <ContextMenu
          x={tabMenu.x}
          y={tabMenu.y}
          onClose={closeTabMenu}
          spec={{ query: { slot: 'tab:context' }, extraItems: tabMenuExtra, footerHints: true }}
          context={{
            '$/surface/name': ctx.surface,
            '$/surface/layoutId': 'tab-panel',
            '$/surface/mountCount': ctx.mounts.length,
            '$/surface/closedHistory': 0,
            '$/group/key': leaf.id,
            '$/group/tabCount': leaf.tabs.length,
            '$/group/canClose': true,
            '$/tab/key': tabMenu.tabKey,
            '$/tab/index': tabMenu.tabIdx,
            '$/tab/leafId': leaf.id,
            '$/tab/isActive': tabMenu.tabKey === activeKey,
            '$/tab/isPinned': ctx.pinned.has(tabMenu.tabKey),
            '$/tab/movable': ctx.mounts.find((m) => m.key === tabMenu.tabKey)?.policy.movable !== false,
            '$/tab/canSplit': true,
            '$/tab/canMove': ctx.leafCount > 1,
          }}
        />
      ) : null}
    </div>
  );
}

function DropPreview({ zone }: { zone: DropZone }) {
  const base: CSSProperties = {
    position: 'absolute',
    pointerEvents: 'none',
    background: 'rgba(59,130,246,0.12)',
    border: '2px solid rgba(59,130,246,0.6)',
    boxSizing: 'border-box',
    zIndex: 5,
    transition: 'all 80ms ease-out',
  };
  const style: CSSProperties = (() => {
    switch (zone) {
      case 'center':
        return { ...base, inset: 0 };
      case 'top':
        return { ...base, top: 0, left: 0, right: 0, height: '50%' };
      case 'bottom':
        return { ...base, bottom: 0, left: 0, right: 0, height: '50%' };
      case 'left':
        return { ...base, top: 0, bottom: 0, left: 0, width: '50%' };
      case 'right':
        return { ...base, top: 0, bottom: 0, right: 0, width: '50%' };
    }
  })();
  return <div className="oo-tab-panel-drop-preview" style={style} />;
}

function readPayload(e: ReactDragEvent<HTMLDivElement>): DragPayload | null {
  const raw = e.dataTransfer.getData(DRAG_MIME);
  if (!raw) return null;
  try {
    const obj = JSON.parse(raw) as DragPayload;
    if (typeof obj.sourceLeafId !== 'string' || typeof obj.tabKey !== 'string') {
      return null;
    }
    return obj;
  } catch {
    return null;
  }
}


function insertTab(
  ctx: TabPanelContext,
  payload: DragPayload,
  targetLeafId: string,
  insertIdx: number,
): void {
  const next = placeTab(ctx.tree, payload.tabKey, targetLeafId, insertIdx);
  if (!next) return;
  ctx.commit(next);
  ctx.onActivate(payload.tabKey);
}

function splitLeafOnDrop(
  ctx: TabPanelContext,
  payload: DragPayload,
  targetLeafId: string,
  zone: Exclude<DropZone, 'center'>,
): void {
  const next = splitAt(ctx.tree, payload.tabKey, targetLeafId, zone);
  // Unchanged: the only tab of a leaf dropped on its own edge.
  if (next === ctx.tree) return;
  ctx.commit(next);
  ctx.onActivate(payload.tabKey);
}

// Recursive node renderer with shared container ref for divider math.
function NodeRender({
  node,
  ctx,
}: {
  node: TabPanelNode;
  ctx: TabPanelContext;
}): ReactNode {
  if (node.kind === 'leaf') {
    return <GroupPanel leaf={node} ctx={ctx} />;
  }
  return <SplitRender node={node} ctx={ctx} />;
}

function SplitRender({
  node,
  ctx,
}: {
  node: TabPanelSplit;
  ctx: TabPanelContext;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const ratio = node.ratio ?? 0.5;

  function onDividerCommit(newRatio: number) {
    const next = replaceSplit(
      ctx.tree,
      (s) => s === node,
      { ratio: newRatio },
    );
    ctx.commit(next);
  }

  const horizontal = node.direction === 'row';
  return (
    <div
      ref={containerRef}
      className="oo-tab-panel-split"
      data-direction={node.direction}
      style={{
        display: 'flex',
        flexDirection: horizontal ? 'row' : 'column',
        flex: 1,
        minWidth: 0,
        minHeight: 0,
      }}
    >
      <div style={{ flex: ratio, minWidth: 0, minHeight: 0, display: 'flex' }}>
        <NodeRender node={node.first} ctx={ctx} />
      </div>
      <Divisor
        direction={node.direction === 'row' ? 'row' : 'col'}
        containerRef={containerRef}
        min={MIN_RATIO}
        max={1 - MIN_RATIO}
        onCommit={onDividerCommit}
      />
      <div
        style={{ flex: 1 - ratio, minWidth: 0, minHeight: 0, display: 'flex' }}
      >
        <NodeRender node={node.second} ctx={ctx} />
      </div>
    </div>
  );
}

// ----- Public component -----

export function TabPanelLayout({
  surface,
  mounts,
  state,
  setState,
  renderMount,
  renderEmpty,
  onActivate,
  onClose,
}: LayoutProps) {
  const mountKeys = mounts.map((m) => m.key);
  const { tree } = reconcile(
    state.tabPanel?.tree,
    mountKeys,
    state.activeContainerKey,
  );

  // Persist the reconciled tree so `state.tabPanel.tree` always equals what's
  // rendered. reconcile() appends just-opened mounts ("orphans") and prunes
  // closed ones at render time only; without writing that back, the raw
  // persisted tree drifts from the view. Every tab.*/group.* context command
  // resolves its target tabs from the raw tree (layout-commands.ts), so on a
  // drifted tree "Close others" / "Close to the right" act on a stale, partial
  // set — e.g. open three tabs, right-click the middle, Close others, and the
  // just-opened tabs survive. reconcile is idempotent, so this converges in one
  // extra render (treesEqual stops the commit once raw == rendered).
  useEffect(() => {
    if (!treesEqual(state.tabPanel?.tree, tree)) {
      setState({ tabPanel: { tree } });
    }
  });

  // Total leaf count drives the `$/tab/canMove` capability — `move to group`
  // only makes sense when there's somewhere to move to.
  const leaves: TabPanelLeaf[] = [];
  collectLeaves(tree, leaves);

  const ctx: TabPanelContext = {
    surface,
    mounts,
    renderMount,
    renderEmpty,
    onActivate,
    onClose,
    tree,
    commit: (next) => setState({ tabPanel: { tree: next } }),
    leafCount: leaves.length,
    pinned: new Set(state.split?.pinned ?? []),
  };

  return (
    <div
      className="oo-layout oo-layout--tab-panel"
      style={{
        display: 'flex',
        height: '100%',
        minHeight: 0,
      }}
    >
      <NodeRender node={tree} ctx={ctx} />
    </div>
  );
}


export function TabTitle({
  m,
  resourceKey,
  isActive,
  dragOverTab,
  idx,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDragLeave,
  onDrop,
  onClick,
  onContextMenu,
  onClose,
  onUnpin,
  isPinned
}: {
  m: ResolvedMount | undefined;
  resourceKey: string;
  idx: number;
  isActive: boolean;
  dragOverTab: number | null;
  isPinned: boolean;
  onDragStart: (e: ReactDragEvent<HTMLDivElement>) => void;
  onDragEnd?: (e: ReactDragEvent<HTMLDivElement>) => void;
  onDragOver: (e: ReactDragEvent<HTMLDivElement>) => void;
  onDragLeave: (e: ReactDragEvent<HTMLDivElement>) => void;
  onDrop: (e: ReactDragEvent<HTMLDivElement>) => void;
  onClick: (e: ReactMouseEvent<HTMLDivElement>) => void;
  onContextMenu: (e: ReactMouseEvent<HTMLDivElement>) => void;
  onClose: (e: ReactMouseEvent<HTMLElement>) => void;
  onUnpin: (e: ReactMouseEvent<HTMLElement>) => void;
}) {
  const { t } = useI18n();
  const scena = useScena();

  // Per-field merge: mount.props ?? component.props ?? key.
  const compProps = m
    ? scena.components.get(m.component.component)?.props
    : undefined;
  const title = useStoreLabel(m?.props?.title ?? compProps?.title, '', m?.dataContext) || resourceKey;
  const icon = m?.props?.icon ?? compProps?.icon;
  const color = m?.props?.color ?? compProps?.color;
  // A tab that becomes active scrolls into the strip's view; one in view already leaves the strip where it is.
  // jsdom has no scrollIntoView, so a consumer's tests that draw tabs do not fail on it.
  const tabRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const tab = tabRef.current;
    if (isActive && typeof tab?.scrollIntoView === 'function') tab.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, [isActive]);
  return (
    <div
      ref={tabRef}
      className="tab-bar__tab"
      data-active={isActive}
      data-drag-over={dragOverTab === idx ? 'true' : undefined}
      data-color={color}
      data-pinned={isPinned || undefined}
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onClick={onClick}
      onContextMenu={onContextMenu}
      title={title}
      style={{
        ...(color ? { '--tab-color': resolveColorRgb(color) } as CSSProperties : {})
      }}
    >
      {icon ? <span className="tab__icon" aria-hidden>{icon}</span> : null}
      <span className="tab__label">{title}</span>
      {isPinned ? (
        <span
          className="pin"
          onClick={(e) => {
            e.stopPropagation();
            onUnpin(e);
          }}
          title={t('tabs/unpin', 'Unpin tab')}
        >
          {NAMED_GLYPH.pin}
        </span>
      ) : (
        <span
          className="close"
          onClick={(e) => {
            e.stopPropagation();
            onClose(e);
          }}
          title={t('common/close', 'Close')}
        >
          {NAMED_GLYPH.closePanel}
        </span>
      )}
    </div>
  );
}