import type { Scena } from '../types/scena.js';
import type { Disposable } from '../types/disposable.js';
import type { CommandContext } from '../types/command.js';
import type {
  ScenaLayout,
  SurfaceLayoutState,
  TabPanelLeaf,
  TabPanelNode,
  TabPanelSplit,
} from '../types/layout.js';
import type { SurfaceName } from '../types/mount-surface.js';
import { combineDisposables } from '../core/disposable.js';
import { BindingPath } from '../types/component-graph.js';
import { translate } from '../i18n/registry.js';

function joinAbs(root: BindingPath | undefined, rel: string): BindingPath {
  if (rel.startsWith('$/')) return rel as BindingPath;
  if (!root) return (rel.startsWith('/') ? `$${rel}` : `$/${rel}`) as BindingPath;
  const base = root.endsWith('/') ? root.slice(0, -1) : root;
  const tail = rel.startsWith('/') ? rel : `/${rel}`;
  return `${base}${tail}` as BindingPath;
}

// Registers the mount-level / group-level / surface-level commands from
// COMMANDS-list.md. Layouts inject `$/tab/*`, `$/group/*`, `$/surface/*`
// capability paths when opening their context menus; these commands read
// from those paths to find their targets. `when` clauses gate visibility
// via commands.list({enabled: true}) — `when` is NOT checked at execute
// time (decoupled in controls/command.ts), so the run body must be its
// own last-mile guard if anything is required.

export function registerLayoutCommands(scena: Scena): Disposable {
  const subs: Disposable[] = [];

  // ── Helpers ──────────────────────────────────────────────────────────────

  function ctxTab(ctx: CommandContext): string | undefined {
    return ctx.store.get<string>('$/tab/key');
  }
  function ctxGroup(ctx: CommandContext): string | undefined {
    return ctx.store.get<string>('$/group/key');
  }
  function ctxSurface(ctx: CommandContext): SurfaceName {
    return (ctx.store.get<SurfaceName>('$/surface/name') ?? 'main') as SurfaceName;
  }
  function ctxTabIndex(ctx: CommandContext): number {
    return Number(ctx.store.get<number>('$/tab/index') ?? 0);
  }

  // Read the surface's current state from layout. Most commands operate
  // through `surfaces.close` / `surfaces.open`; only group-level tree
  // mutations need the layout tree directly.
  function surfaceState(ctx: CommandContext): SurfaceLayoutState | undefined {
    const surface = ctxSurface(ctx);
    return ctx.scena.layout.get().surfaces[surface];
  }

  function setTabPanelTree(ctx: CommandContext, tree: TabPanelNode | null): void {
    const surface = ctxSurface(ctx);
    const cur = ctx.scena.layout.get().surfaces[surface];
    ctx.scena.layout.setSurface(surface, {
      ...cur,
      tabPanel: tree ? { tree } : undefined,
    });
  }

  // Set of pinned mount keys on the right-clicked surface. Bulk-close
  // commands (closeOthers, closeToRight, ...) filter through this so pinned
  // tabs survive "close all but me"-style operations — matches VS Code.
  function pinnedKeys(ctx: CommandContext): Set<string> {
    const cur = surfaceState(ctx);
    return new Set(cur?.split?.pinned ?? []);
  }

  // Pin / unpin a tab on the right-clicked surface. Pinned mount keys live
  // in `state.split.pinned` so they persist with the layout; layouts swap
  // the × close affordance for a pin icon when a tab is in this set.
  function togglePinned(ctx: CommandContext, key: string, pin: boolean): void {
    const surface = ctxSurface(ctx);
    const cur = ctx.scena.layout.get().surfaces[surface];
    const current = new Set(cur?.split?.pinned ?? []);
    if (pin) current.add(key);
    else current.delete(key);
    ctx.scena.layout.setSurface(surface, {
      ...cur,
      split: { ...(cur?.split ?? {}), pinned: [...current] },
    });
  }

  // Walk the tab-panel tree to find a leaf by id; returns the leaf + the
  // ordered list of tab keys in it (so commands can find siblings).
  function findLeaf(tree: TabPanelNode, leafId: string): TabPanelLeaf | null {
    if (tree.kind === 'leaf') return tree.id === leafId ? tree : null;
    return findLeaf(tree.first, leafId) ?? findLeaf(tree.second, leafId);
  }

  // Collect all leaves so commands like `tab.moveToGroup` can list them.
  function collectLeaves(tree: TabPanelNode, out: TabPanelLeaf[] = []): TabPanelLeaf[] {
    if (tree.kind === 'leaf') {
      out.push(tree);
      return out;
    }
    collectLeaves(tree.first, out);
    collectLeaves(tree.second, out);
    return out;
  }

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

  function newLeafId(): string {
    return `g_${Math.random().toString(36).slice(2, 10)}`;
  }

  // ── Mount-level commands ─────────────────────────────────────────────────

  subs.push(
    scena.commands.register({
      id: 'tab.close',
      title: () => translate('tabs/close', 'Close tab'),
      icon: '✕',
      color: 'red',
      slots: ['tab:context', 'card:context'],
      // Pinned tabs hide the close affordance entirely — the menu shows
      // Unpin instead, and the user must unpin first to close. Matches
      // VS Code-style pin semantics.
      when: '$/tab/isPinned == false',
      run: (ctx) => {
        const key = ctxTab(ctx);
        if (!key) return;
        ctx.store.set(joinAbs(ctx.dataContext, '/lastClosed'), String(key));
        ctx.surfaces.close(key);
        ctx.host?.closeMenu();
      },
    }),

    scena.commands.register({
      id: 'tab.closeOthers',
      // title: 'Close others',
      title: () => translate('tabs/closeOthers', 'Close others'),
      icon: '−',
      color: 'orange',
      slots: ['tab:context'],
      when: '$/group/tabCount > 1',
      run: (ctx) => {
        const key = ctxTab(ctx);
        const leafId = ctx.store.get<string>('$/tab/leafId');
        if (!key) return;
        const keys = tabsInLeafOrSurface(ctx, leafId);
        const pinned = pinnedKeys(ctx);
        for (const k of keys) if (k !== key && !pinned.has(k)) ctx.surfaces.close(k);
        ctx.host?.closeMenu();
      },
    }),

    scena.commands.register({
      id: 'tab.closeToRight',
      title: () => translate('tabs/closeRight', 'Close to the right'),
      icon: '⇥',
      color: 'orange',
      slots: ['tab:context'],
      when: '$/group/tabCount > 1',
      run: (ctx) => {
        const key = ctxTab(ctx);
        if (!key) return;
        const leafId = ctx.store.get<string>('$/tab/leafId');
        const keys = tabsInLeafOrSurface(ctx, leafId);
        const idx = ctxTabIndex(ctx);
        const pinned = pinnedKeys(ctx);
        for (let i = idx + 1; i < keys.length; i++) {
          const k = keys[i];
          if (k && !pinned.has(k)) ctx.surfaces.close(k);
        }
        ctx.host?.closeMenu();
      },
    }),

    scena.commands.register({
      id: 'tab.closeToLeft',
      title: () => translate('tabs/closeLeft', 'Close to the left'),
      icon: '⇤',      
      color: 'orange',
      slots: ['tab:context'],
      when: '$/group/tabCount > 1 && $/tab/index > 0',
      run: (ctx) => {
        const leafId = ctx.store.get<string>('$/tab/leafId');
        const keys = tabsInLeafOrSurface(ctx, leafId);
        const idx = ctxTabIndex(ctx);
        const pinned = pinnedKeys(ctx);
        for (let i = 0; i < idx; i++) {
          const k = keys[i];
          if (k && !pinned.has(k)) ctx.surfaces.close(k);
        }
        ctx.host?.closeMenu();
      },
    }),

    scena.commands.register({
      id: 'tab.pin',
      title: () => translate('tabs/pin', 'Pin tab'),
      icon: '📌︎',
      color: 'amber',
      slots: ['tab:context'],
      // Only visible when this tab is NOT already pinned. The previous
      // implementation wrote a global `/pinned = true` boolean via
      // `joinAbs(ctx.dataContext, '/pinned')` — that affected nothing the
      // layouts read. Per-tab pin state belongs in the surface's
      // `state.split.pinned` array so it persists with the layout.
      when: '$/tab/isPinned == false',
      run: (ctx) => {
        const key = ctxTab(ctx);
        if (!key) return;
        togglePinned(ctx, key, true);
        ctx.host?.closeMenu();
      },
    }),
    scena.commands.register({
      id: 'tab.unpin',
      title: () => translate('tabs/unpin', 'Unpin tab'),
      icon: '📌︎',
      color: 'amber',
      slots: ['tab:context'],
      when: '$/tab/isPinned == true',
      run: (ctx) => {
        const key = ctxTab(ctx);
        if (!key) return;
        togglePinned(ctx, key, false);
        ctx.host?.closeMenu();
      },
    }),

    scena.commands.register({
      id: 'tab.copyKey',
      title: () => translate('tabs/copyKey', 'Copy key'),
      icon: '⎘',
      color: 'sky',
      slots: ['tab:context', 'card:context'],
      run: (ctx) => {
        const key = ctxTab(ctx);
        if (!key) return;
        void navigator.clipboard?.writeText(key);
        ctx.host?.closeMenu();
      },
    }),

    scena.commands.register({
      id: 'tab.openToRight',
      title: () => translate('tabs/openToRight', 'Open to the right'),
      icon: '⇨',
      color: 'blue',
      slots: ['tab:context'],
      when: '$/tab/canSplit == true',
      run: (ctx) => splitTabIntoNewLeaf(ctx, 'right'),
    }),

    scena.commands.register({
      id: 'tab.openToBottom',
      title: () => translate('tabs/openToBottom', 'Open to the bottom'),
      icon: '⇩',
      color: 'blue',
      slots: ['tab:context'],
      when: '$/tab/canSplit == true',
      run: (ctx) => splitTabIntoNewLeaf(ctx, 'bottom'),
    }),

    scena.commands.register({
      id: 'tab.openToLeft',
      title: () => translate('tabs/openToLeft', 'Open to the left'),
      icon: '⇦',
      color: 'blue',
      slots: ['tab:context'],
      when: '$/tab/canSplit == true',
      run: (ctx) => splitTabIntoNewLeaf(ctx, 'left'),
    }),

    scena.commands.register({
      id: 'tab.openToTop',
      title: () => translate('tabs/openToTop', 'Open to the top'),
      icon: '⇧',
      color: 'blue',
      slots: ['tab:context'],
      when: '$/tab/canSplit == true',
      run: (ctx) => splitTabIntoNewLeaf(ctx, 'top'),
    }),
  );

  // ── Group-level commands ─────────────────────────────────────────────────

  subs.push(
    scena.commands.register({
      id: 'group.closeAll',
      title: () => translate('tabs/closeAll', 'Close all in group'),
      icon: '✖',
      color: 'red',
      slots: ['tab:context', 'tab-group:context'],
      when: '$/group/tabCount > 0',
      run: (ctx) => {
        const leafId = ctxGroup(ctx);
        const keys = tabsInLeafOrSurface(ctx, leafId);
        const pinned = pinnedKeys(ctx);
        for (const k of keys) if (!pinned.has(k)) ctx.surfaces.close(k);
        ctx.host?.closeMenu();
      },
    }),
    scena.commands.register({
      id: 'group.splitRight',
      title: () => translate('tabs/splitRight', 'Split group right'),
      icon: '⇨',
      color: 'blue',
      slots: ['tab-group:context'],
      when: '$/tab/canSplit == true',
      run: (ctx) => splitGroup(ctx, 'row', 'second'),
    }),
    scena.commands.register({
      id: 'group.splitDown',
      title: () => translate('tabs/splitDown', 'Split group down'),
      icon: '⇩',
      color: 'blue',
      slots: ['tab-group:context'],
      when: '$/tab/canSplit == true',
      run: (ctx) => splitGroup(ctx, 'column', 'second'),
    }),
    scena.commands.register({
      id: 'group.splitLeft',
      title: () => translate('tabs/splitLeft', 'Split group left'),
      icon: '⇦',
      color: 'blue',
      slots: ['tab-group:context'],
      when: '$/tab/canSplit == true',
      run: (ctx) => splitGroup(ctx, 'row', 'first'),
    }),
    scena.commands.register({
      id: 'group.splitUp',
      title: () => translate('tabs/splitUp', 'Split group up'),
      icon: '⇧',
      color: 'blue',
      slots: ['tab-group:context'],
      when: '$/tab/canSplit == true',
      run: (ctx) => splitGroup(ctx, 'column', 'first'),
    }),
    // scena.commands.register({
    //   id: 'group.closeOthersInGroup',
    //   title: () => translate('tabs/closeOthersInGroup', 'Close others (except active)'),
    //   icon: '✖',
    //   color: 'red',
    //   slots: ['tab-group:context'],
    //   when: '$/group/tabCount > 1',
    //   run: (ctx) => {
    //     const leafId = ctxGroup(ctx);
    //     const state = surfaceState(ctx);
    //     const activeKey = state?.activeContainerKey;
    //     const keys = tabsInLeafOrSurface(ctx, leafId);
    //     const pinned = pinnedKeys(ctx);
    //     for (const k of keys) if (k !== activeKey && !pinned.has(k)) ctx.surfaces.close(k);
    //     ctx.host?.closeMenu();
    //   },
    // }),
    scena.commands.register({
      id: 'group.closeOtherGroups',
      title: () => translate('tabs/closeOtherGroups', 'Close others (except active group)'),
      icon: '✖',
      color: 'red',
      slots: ['tab-group:context'],
      // when: '$/surface/layoutId == "tab-panel"',
      run: (ctx) => {
        const leafId = ctxGroup(ctx);
        const state = surfaceState(ctx);
        const tree = state?.tabPanel?.tree;
        if (!tree || !leafId) return;
        const target = findLeaf(tree, leafId);
        if (!target) return;
        // Close every tab not in target leaf, except pinned ones.
        const keep = new Set(target.tabs);
        const pinned = pinnedKeys(ctx);
        const others: string[] = [];
        for (const leaf of collectLeaves(tree)) {
          if (leaf.id === leafId) continue;
          for (const k of leaf.tabs) if (!keep.has(k) && !pinned.has(k)) others.push(k);
        }
        for (const k of others) ctx.surfaces.close(k);
        // Drop all other leaves from the tree. Pinned tabs in those leaves
        // were skipped above and remain in the registry — they'll get
        // re-homed into the surviving target leaf by TabPanelLayout's
        // orphan-reattach logic on the next render.
        const next = mapLeaves(tree, (l) => (l.id === leafId ? l : null));
        setTabPanelTree(ctx, next);
        ctx.host?.closeMenu();
      },
    }),
    scena.commands.register({
      id: 'group.close',
      title: () => translate('tabs/closeGroup', 'Close group'),
      icon: '✖',
      color: 'red',
      slots: ['tab-group:context'],
      when: '$/group/canClose == true',
      run: (ctx) => {
        const leafId = ctxGroup(ctx);
        const state = surfaceState(ctx);
        const tree = state?.tabPanel?.tree;
        if (!tree || !leafId) return;
        const target = findLeaf(tree, leafId);
        if (!target) return;
        const pinned = pinnedKeys(ctx);
        for (const k of target.tabs) if (!pinned.has(k)) ctx.surfaces.close(k);
        const next = mapLeaves(tree, (l) => (l.id === leafId ? null : l));
        setTabPanelTree(ctx, next);
        ctx.host?.closeMenu();
      },
    }),
  );

  // ── Surface-level commands ───────────────────────────────────────────────

  subs.push(
    scena.commands.register({
      id: 'surface.closeAll',
      title: () => translate('tabs/closeAll', 'Close all'),
      icon: '✖',
      color: 'red',
      slots: ['surface:context'],
      when: '$/surface/mountCount > 0',
      run: (ctx) => {
        const surface = ctxSurface(ctx);
        const mounts = ctx.scena.surfaces.listAt(surface);
        const pinned = pinnedKeys(ctx);
        for (const m of mounts) if (!pinned.has(m.key)) ctx.surfaces.close(m.key);
        ctx.host?.closeMenu();
      },
    }),
    ...layoutSwitchCommands(scena),
  );

  // Prune stale entries from every surface's `state.split.pinned` whenever
  // a mount closes — covers the bulk-close commands above AND any other
  // close path (× button, programmatic close, etc.). Without this, closing
  // a pinned tab leaves its key in the array, so re-opening the same key
  // later would resurrect a phantom pinned state.
  subs.push(
    scena.events.on('scena:mount:closed', (raw) => {
      const ev = raw as { key: string };
      const layout = scena.layout.get();
      for (const [surface, st] of Object.entries(layout.surfaces)) {
        const pinned = st?.split?.pinned;
        if (!pinned || !pinned.includes(ev.key)) continue;
        scena.layout.setSurface(surface as SurfaceName, {
          ...st,
          split: { ...st!.split, pinned: pinned.filter((k) => k !== ev.key) },
        });
      }
    }),
  );

  return combineDisposables(...subs);

  // ── Internal helpers (closures over the helpers above) ───────────────────

  function tabsInLeafOrSurface(ctx: CommandContext, leafId: string | undefined): string[] {
    const surface = ctxSurface(ctx);
    if (leafId) {
      const state = ctx.scena.layout.get().surfaces[surface];
      const tree = state?.tabPanel?.tree;
      if (tree) {
        const leaf = findLeaf(tree, leafId);
        if (leaf) return [...leaf.tabs];
      }
    }
    return ctx.scena.surfaces.listAt(surface).map((m) => m.key);
  }

  // For TabPanelLayout: split the right-clicked leaf, moving the right-clicked
  // tab into a new sibling leaf on the given side. Wires the new leaf into
  // the tree via replaceLeaf. The drag-drop equivalent of this lives in
  // TabPanelLayout's splitLeafOnDrop — same shape.
  function splitTabIntoNewLeaf(
    ctx: CommandContext,
    side: 'left' | 'right' | 'top' | 'bottom',
  ): void {
    const key = ctxTab(ctx);
    const leafId = ctx.store.get<string>('$/tab/leafId');
    if (!key || !leafId) return;
    const state = surfaceState(ctx);
    const tree = state?.tabPanel?.tree;
    if (!tree) return;
    const sourceLeaf = findLeaf(tree, leafId);
    if (!sourceLeaf) return;
    // Remove the tab from its source leaf.
    const remaining = sourceLeaf.tabs.filter((k) => k !== key);
    const sourceUpdated: TabPanelLeaf = {
      ...sourceLeaf,
      tabs: remaining,
      activeKey: remaining.includes(sourceLeaf.activeKey ?? '')
        ? sourceLeaf.activeKey
        : remaining[0],
    };
    const newLeaf: TabPanelLeaf = {
      kind: 'leaf',
      id: newLeafId(),
      tabs: [key],
      activeKey: key,
    };
    const direction = side === 'left' || side === 'right' ? 'row' : 'column';
    const first = side === 'left' || side === 'top' ? newLeaf : sourceUpdated;
    const second = side === 'left' || side === 'top' ? sourceUpdated : newLeaf;
    const split: TabPanelSplit = {
      kind: 'split',
      direction,
      ratio: 0.5,
      first,
      second,
    };
    const next = replaceLeaf(tree, leafId, split);
    setTabPanelTree(ctx, next);
    ctx.host?.closeMenu();
  }

  // For TabPanelLayout: split the right-clicked GROUP (leaf), placing the
  // existing leaf on one side and an empty leaf on the other.
  function splitGroup(
    ctx: CommandContext,
    direction: 'row' | 'column',
    newSide: 'first' | 'second',
  ): void {
    const leafId = ctxGroup(ctx);
    if (!leafId) return;
    const state = surfaceState(ctx);
    const tree = state?.tabPanel?.tree;
    if (!tree) return;
    const leaf = findLeaf(tree, leafId);
    if (!leaf) return;
    const empty: TabPanelLeaf = {
      kind: 'leaf',
      id: newLeafId(),
      tabs: [],
      activeKey: undefined,
    };
    const split: TabPanelSplit = {
      kind: 'split',
      direction,
      ratio: 0.5,
      first: newSide === 'first' ? empty : leaf,
      second: newSide === 'first' ? leaf : empty,
    };
    const next = replaceLeaf(tree, leafId, split);
    setTabPanelTree(ctx, next);
    ctx.host?.closeMenu();
  }
}

// Returns the layout-switch commands as a flat array so they can be spread
// into the main subs list.
function layoutSwitchCommands(scena: Scena): Disposable[] {
  const targets: Array<{ id: string; title: string; layoutId: string }> = [
    { id: 'surface.setLayout.tab', title: 'Layout: Tabs', layoutId: 'tab' },
    { id: 'surface.setLayout.tabPanel', title: 'Layout: Tab groups', layoutId: 'tab-panel' },
    { id: 'surface.setLayout.split', title: 'Layout: Split', layoutId: 'split' },
    { id: 'surface.setLayout.spatial', title: 'Layout: Spatial', layoutId: 'spatial' },
    { id: 'surface.setLayout.stack', title: 'Layout: Stack', layoutId: 'stack' },
    { id: 'surface.setLayout.single', title: 'Layout: Single', layoutId: 'single' },
  ];
  return targets.map((t) =>
    scena.commands.register({
      id: t.id,
      title: t.title,
      slots: ['surface:context'],
      when: `$/surface/layoutId != "${t.layoutId}"`,
      run: (ctx) => {
        const surface = (ctx.store.get<SurfaceName>('$/surface/name') ?? 'main') as SurfaceName;
        const cur = ctx.scena.layout.get().surfaces[surface];
        ctx.scena.layout.setSurface(surface, { ...cur, layout: t.layoutId });
        ctx.host?.closeMenu();
      },
    }),
  );
}

// Type re-export to satisfy strict isolatedModules checks — not strictly
// required here but keeps the consumer surface tidy.
export type { ScenaLayout };
