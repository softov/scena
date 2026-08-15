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
  TabPanelDirection,
  TabPanelLeaf,
  TabPanelNode,
  TabPanelSplit,
} from '../../types/layout.js';
import type { ResolvedMount } from '../../types/mount-surface.js';
import { useScena } from '../../react/ScenaProvider.js';
import { ContextMenu } from '../menu/ContextMenu.js';
import { Divisor } from '../display/Divisor.js';
import { resolveColorRgb } from '../../types/colors.js';
import { NAMED_GLYPH } from '../display/Icon.js';
import { useStoreLabel } from '../../react/hooks/useStoreLabel.js';

// Multi-group tabs. Recursive binary tree: a leaf is one Tab strip; a split
// holds two children with a draggable divider. Drag a tab onto another
// leaf's 5 zones to either join (center) or split (top/right/bottom/left).
// Each leaf has a top-right [...] menu for group-level actions.

const DRAG_MIME = 'application/x-scena-tab-panel';
const EDGE_THRESHOLD = 0.2;
const MIN_RATIO = 0.05;

// ----- Tree helpers (pure) -----

function newLeafId(): string {
  // Random suffix — the previous `g${counter}` scheme collided with persisted
  // tree leaf ids after a reload (the counter resets, localStorage doesn't),
  // producing two leaves with the same id. `replaceLeaf` then mutated both,
  // and `mapLeaves(... ? null : l)` dropped both, collapsing whole splits.
  return `g_${Math.random().toString(36).slice(2, 10)}`;
}

function makeLeaf(tabs: string[], activeKey?: string): TabPanelLeaf {
  return { kind: 'leaf', id: newLeafId(), tabs, activeKey };
}

function collectTabs(node: TabPanelNode, out: Set<string>): void {
  if (node.kind === 'leaf') {
    for (const k of node.tabs) out.add(k);
    return;
  }
  collectTabs(node.first, out);
  collectTabs(node.second, out);
}

function collectLeaves(node: TabPanelNode, out: TabPanelLeaf[]): void {
  if (node.kind === 'leaf') {
    out.push(node);
    return;
  }
  collectLeaves(node.first, out);
  collectLeaves(node.second, out);
}

// Strip dead tabs from each leaf. Empty leaves are KEPT — a leaf only goes
// away through explicit user action (drag-last-tab-out via `removeTab`, or
// "Close group" via the leaf menu). That's what makes "Split group right"
// usable: the freshly-created sibling leaf is empty by design and must
// survive the next render so the user can drop a tab into it.
function pruneTree(node: TabPanelNode, alive: Set<string>): TabPanelNode {
  if (node.kind === 'leaf') {
    const tabs = node.tabs.filter((k) => alive.has(k));
    const activeKey = node.activeKey && alive.has(node.activeKey)
      ? node.activeKey
      : tabs[0];
    return { ...node, tabs, activeKey };
  }
  return {
    ...node,
    first: pruneTree(node.first, alive),
    second: pruneTree(node.second, alive),
  };
}

// Map across leaves; if `fn` returns null, the leaf is dropped (parent
// collapses to surviving sibling). Returns null if every leaf dropped.
function mapLeaves(
  node: TabPanelNode,
  fn: (leaf: TabPanelLeaf) => TabPanelNode | null,
): TabPanelNode | null {
  if (node.kind === 'leaf') return fn(node);
  const first = mapLeaves(node.first, fn);
  const second = mapLeaves(node.second, fn);
  if (first && second) return { ...node, first, second };
  return first ?? second;
}

// Replace one leaf identified by id. Used by split-on-drop.
function replaceLeaf(
  node: TabPanelNode,
  leafId: string,
  replacement: TabPanelNode,
): TabPanelNode {
  if (node.kind === 'leaf') return node.id === leafId ? replacement : node;
  return {
    ...node,
    first: replaceLeaf(node.first, leafId, replacement),
    second: replaceLeaf(node.second, leafId, replacement),
  };
}

// Find a parent split that contains `leafId` directly, return path so we
// can rewrite ratio at the divider. (Not used for v1; ratio updates flow
// through replaceSplit below.)
function replaceSplit(
  node: TabPanelNode,
  match: (split: TabPanelSplit) => boolean,
  patch: Partial<TabPanelSplit>,
): TabPanelNode {
  if (node.kind === 'leaf') return node;
  if (match(node)) return { ...node, ...patch };
  return {
    ...node,
    first: replaceSplit(node.first, match, patch),
    second: replaceSplit(node.second, match, patch),
  };
}

// ----- Reconcile against current mounts -----

interface Reconciled {
  tree: TabPanelNode;
}

// Reassigns ids for any leaf whose id was already seen in this walk. Heals
// trees persisted before the `newLeafId` collision fix landed — without this,
// `replaceLeaf` would mutate every leaf sharing the duplicate id at once.
function dedupeLeafIds(node: TabPanelNode, seen: Set<string>): TabPanelNode {
  if (node.kind === 'leaf') {
    if (seen.has(node.id)) {
      const fresh = newLeafId();
      seen.add(fresh);
      return { ...node, id: fresh };
    }
    seen.add(node.id);
    return node;
  }
  return {
    ...node,
    first: dedupeLeafIds(node.first, seen),
    second: dedupeLeafIds(node.second, seen),
  };
}

function reconcile(
  raw: TabPanelNode | undefined,
  mountKeys: string[],
  focusedKey: string | undefined,
): Reconciled {
  const alive = new Set(mountKeys);
  let tree: TabPanelNode = raw
    ? dedupeLeafIds(pruneTree(raw, alive), new Set())
    : makeLeaf([...mountKeys], focusedKey);

  // Append orphans (mounts not in tree yet). Prefer the leaf holding the
  // focused key; otherwise the first non-empty leaf; otherwise the first
  // leaf. Intentional empty groups (split-right / split-down) are NOT
  // auto-filled — they wait for an explicit drop.
  const present = new Set<string>();
  collectTabs(tree, present);
  const orphans = mountKeys.filter((k) => !present.has(k));
  if (orphans.length > 0) {
    const leaves: TabPanelLeaf[] = [];
    collectLeaves(tree, leaves);
    const target =
      (focusedKey && leaves.find((l) => l.tabs.includes(focusedKey))) ||
      leaves.find((l) => l.tabs.length > 0) ||
      leaves[0];
    if (target) {
      // Pick the active tab for the target leaf. Prefer focusedKey when it's
      // one of the orphans we just appended; otherwise the last orphan wins
      // (most recently opened). Without this, the leaf would keep showing
      // whatever was active before — the user clicks "open" and nothing
      // visibly changes.
      const newActive =
        focusedKey && orphans.includes(focusedKey)
          ? focusedKey
          : orphans[orphans.length - 1];
      tree = replaceLeaf(tree, target.id, {
        ...target,
        tabs: [...target.tabs, ...orphans],
        activeKey: newActive,
      });
    }
  }

  // Re-open case: tab already exists in some leaf but focusedKey just
  // changed (surfaces.open → focus emits scena:mount:focused →
  // activeContainerKey updates). Sync the containing leaf's activeKey so the
  // tab actually becomes active in its leaf.
  if (focusedKey) {
    const next = mapLeaves(tree, (l) => {
      if (l.tabs.includes(focusedKey) && l.activeKey !== focusedKey) {
        return { ...l, activeKey: focusedKey };
      }
      return l;
    });
    if (next) tree = next;
  }

  return { tree };
}

// Structural (key-order-independent) equality for two trees. Used to decide
// whether the reconciled tree needs to be written back to state — a JSON
// compare would risk a false-negative on key order and loop the commit effect.
function treesEqual(a: TabPanelNode | undefined, b: TabPanelNode | undefined): boolean {
  if (a === b) return true;
  if (!a || !b || a.kind !== b.kind) return false;
  if (a.kind === 'leaf' && b.kind === 'leaf') {
    return (
      a.id === b.id &&
      a.activeKey === b.activeKey &&
      a.tabs.length === b.tabs.length &&
      a.tabs.every((t, i) => t === b.tabs[i])
    );
  }
  if (a.kind === 'split' && b.kind === 'split') {
    return (
      a.direction === b.direction &&
      (a.ratio ?? 0.5) === (b.ratio ?? 0.5) &&
      treesEqual(a.first, b.first) &&
      treesEqual(a.second, b.second)
    );
  }
  return false;
}

// ----- Components -----

type DropZone = 'center' | 'top' | 'right' | 'bottom' | 'left';

interface DragPayload {
  sourceLeafId: string;
  tabKey: string;
}

interface TabPanelContext {
  surface: string;
  mounts: ResolvedMount[];
  renderMount: (m: ResolvedMount) => unknown;
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
  const scena = useScena();
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
    window.addEventListener('dragend', clearAll);
    window.addEventListener('drop', clearAll);
    return () => {
      window.removeEventListener('dragend', clearAll);
      window.removeEventListener('drop', clearAll);
    };
  }, []);

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
    e.dataTransfer.effectAllowed = 'move';
  }

  // ----- Tab-strip drop (reorder within strip OR move into this leaf) -----
  function onTabStripDragOver(
    e: ReactDragEvent<HTMLDivElement>,
    idx: number,
  ) {
    if (!e.dataTransfer.types.includes(DRAG_MIME)) return;
    e.preventDefault();
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
    if (!e.dataTransfer.types.includes(DRAG_MIME)) return;
    e.preventDefault();
    setDragOverTab(null);
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
    if (!e.dataTransfer.types.includes(DRAG_MIME)) return;
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
    if (!e.dataTransfer.types.includes(DRAG_MIME)) return;
    e.preventDefault();
    const z = computeZone(e);
    setZone(null);
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
            title="Group actions"
            aria-label="Group actions"
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
          <div style={{ padding: 24, color: 'var(--oo-color-muted)' }}>
            Empty group. Drag a tab here.
          </div>
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

// Remove `tabKey` from the leaf that holds it; if that leaf is the
// target's same leaf, just rewrite tabs; otherwise prune empty leaves.
function removeTab(tree: TabPanelNode, tabKey: string): TabPanelNode | null {
  return mapLeaves(tree, (l) => {
    if (!l.tabs.includes(tabKey)) return l;
    const tabs = l.tabs.filter((k) => k !== tabKey);
    if (tabs.length === 0) return null;
    return {
      ...l,
      tabs,
      activeKey: l.activeKey === tabKey ? tabs[0] : l.activeKey,
    };
  });
}

function insertTab(
  ctx: TabPanelContext,
  payload: DragPayload,
  targetLeafId: string,
  insertIdx: number,
): void {
  // Same-leaf reorder
  if (payload.sourceLeafId === targetLeafId) {
    const next = mapLeaves(ctx.tree, (l) => {
      if (l.id !== targetLeafId) return l;
      const fromIdx = l.tabs.indexOf(payload.tabKey);
      if (fromIdx === -1) return l;
      const tabs = [...l.tabs];
      tabs.splice(fromIdx, 1);
      const adjusted = fromIdx < insertIdx ? insertIdx - 1 : insertIdx;
      tabs.splice(adjusted, 0, payload.tabKey);
      return { ...l, tabs, activeKey: payload.tabKey };
    });
    if (next) ctx.commit(next);
    ctx.onActivate(payload.tabKey);
    return;
  }
  // Cross-leaf: remove from source, insert into target.
  const removed = removeTab(ctx.tree, payload.tabKey);
  if (!removed) return;
  const inserted = mapLeaves(removed, (l) => {
    if (l.id !== targetLeafId) return l;
    const tabs = [...l.tabs];
    const clamped = Math.max(0, Math.min(insertIdx, tabs.length));
    tabs.splice(clamped, 0, payload.tabKey);
    return { ...l, tabs, activeKey: payload.tabKey };
  });
  if (inserted) ctx.commit(inserted);
  ctx.onActivate(payload.tabKey);
}

function splitLeafOnDrop(
  ctx: TabPanelContext,
  payload: DragPayload,
  targetLeafId: string,
  zone: Exclude<DropZone, 'center'>,
): void {
  // Edge case: dragging the only tab of a leaf onto itself — no-op.
  let sourceTree: TabPanelNode | null = ctx.tree;
  const sourceLeaf = collectLeavesById(sourceTree, payload.sourceLeafId);
  if (
    sourceLeaf &&
    sourceLeaf.id === targetLeafId &&
    sourceLeaf.tabs.length === 1
  ) {
    return;
  }
  sourceTree = removeTab(sourceTree, payload.tabKey);
  if (!sourceTree) return;

  const target = collectLeavesById(sourceTree, targetLeafId);
  if (!target) return;

  const newLeaf = makeLeaf([payload.tabKey], payload.tabKey);
  const direction: TabPanelDirection =
    zone === 'left' || zone === 'right' ? 'row' : 'column';
  const newFirst = zone === 'left' || zone === 'top' ? newLeaf : target;
  const newSecond = zone === 'left' || zone === 'top' ? target : newLeaf;
  const split: TabPanelSplit = {
    kind: 'split',
    direction,
    ratio: 0.5,
    first: newFirst,
    second: newSecond,
  };
  const next = replaceLeaf(sourceTree, targetLeafId, split);
  ctx.commit(next);
  ctx.onActivate(payload.tabKey);
}

function collectLeavesById(node: TabPanelNode, id: string): TabPanelLeaf | null {
  if (node.kind === 'leaf') return node.id === id ? node : null;
  return (
    collectLeavesById(node.first, id) || collectLeavesById(node.second, id)
  );
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
  onDragOver: (e: ReactDragEvent<HTMLDivElement>) => void;
  onDragLeave: (e: ReactDragEvent<HTMLDivElement>) => void;
  onDrop: (e: ReactDragEvent<HTMLDivElement>) => void;
  onClick: (e: ReactMouseEvent<HTMLDivElement>) => void;
  onContextMenu: (e: ReactMouseEvent<HTMLDivElement>) => void;
  onClose: (e: ReactMouseEvent<HTMLElement>) => void;
  onUnpin: (e: ReactMouseEvent<HTMLElement>) => void;
}) {
  const scena = useScena();

  // Per-field merge: mount.props ?? component.props ?? key.
  const compProps = m
    ? scena.components.get(m.component.component)?.props
    : undefined;
  const title = useStoreLabel(m?.props?.title ?? compProps?.title, '', m?.dataContext) || resourceKey;
  const icon = m?.props?.icon ?? compProps?.icon;
  const color = m?.props?.color ?? compProps?.color;
  return (
    <div
      className="tab-bar__tab"
      data-active={isActive}
      data-drag-over={dragOverTab === idx ? 'true' : undefined}
      data-color={color}
      data-pinned={isPinned || undefined}
      draggable
      onDragStart={onDragStart}
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
          title="Unpin"
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
          title="Close"
        >
          {NAMED_GLYPH.closePanel}
        </span>
      )}
    </div>
  );
}