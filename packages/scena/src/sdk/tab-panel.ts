// The tab-panel tree, as pure functions over `TabPanelNode`.
//
// A `tab-panel` layout keeps its groups as a binary tree in its surface state
// (`tabPanel.tree`). These functions return a new tree and never touch the
// store, so a layout can edit the tree of ANOTHER surface too: a tab dragged
// from one surface to another leaves the source tree and joins the target's.

import type {
  TabPanelDirection,
  TabPanelLeaf,
  TabPanelNode,
  TabPanelSplit,
} from './layout.js';


export function newLeafId(): string {
  // Random suffix — the previous `g${counter}` scheme collided with persisted
  // tree leaf ids after a reload (the counter resets, localStorage doesn't),
  // producing two leaves with the same id. `replaceLeaf` then mutated both,
  // and `mapLeaves(... ? null : l)` dropped both, collapsing whole splits.
  return `g_${Math.random().toString(36).slice(2, 10)}`;
}

export function makeLeaf(tabs: string[], activeKey?: string): TabPanelLeaf {
  return { kind: 'leaf', id: newLeafId(), tabs, activeKey };
}

export function collectTabs(node: TabPanelNode, out: Set<string>): void {
  if (node.kind === 'leaf') {
    for (const k of node.tabs) out.add(k);
    return;
  }
  collectTabs(node.first, out);
  collectTabs(node.second, out);
}

export function collectLeaves(node: TabPanelNode, out: TabPanelLeaf[]): void {
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
export function pruneTree(node: TabPanelNode, alive: Set<string>): TabPanelNode {
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
export function mapLeaves(
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
export function replaceLeaf(
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
export function replaceSplit(
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

export interface Reconciled {
  tree: TabPanelNode;
}

// Reassigns ids for any leaf whose id was already seen in this walk. Heals
// trees persisted before the `newLeafId` collision fix landed — without this,
// `replaceLeaf` would mutate every leaf sharing the duplicate id at once.
export function dedupeLeafIds(node: TabPanelNode, seen: Set<string>): TabPanelNode {
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

export function reconcile(
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
export function treesEqual(a: TabPanelNode | undefined, b: TabPanelNode | undefined): boolean {
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


// Remove `tabKey` from the leaf that holds it; if that leaf is the
// target's same leaf, just rewrite tabs; otherwise prune empty leaves.
export function removeTab(tree: TabPanelNode, tabKey: string): TabPanelNode | null {
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

export function collectLeavesById(node: TabPanelNode, id: string): TabPanelLeaf | null {
  if (node.kind === 'leaf') return node.id === id ? node : null;
  return (
    collectLeavesById(node.first, id) || collectLeavesById(node.second, id)
  );
}

// Where a drop on a group's body lands: the centre joins the group, an edge
// splits it.
export type TabPanelDropZone = 'center' | 'top' | 'right' | 'bottom' | 'left';

// Put `key` in leaf `leafId` at `index`, and make it that leaf's active tab.
// A key already in that leaf is reordered; a key in another leaf leaves it
// (an emptied leaf goes); a key in no leaf -- a tab from another surface --
// is only added. Null when the target leaf is not in the tree.
export function placeTab(
  tree: TabPanelNode,
  key: string,
  leafId: string,
  index: number,
): TabPanelNode | null {
  const target = collectLeavesById(tree, leafId);
  if (!target) return null;
  if (target.tabs.includes(key)) {
    return mapLeaves(tree, (l) => {
      if (l.id !== leafId) return l;
      const fromIdx = l.tabs.indexOf(key);
      const tabs = [...l.tabs];
      tabs.splice(fromIdx, 1);
      const adjusted = fromIdx < index ? index - 1 : index;
      tabs.splice(Math.max(0, Math.min(adjusted, tabs.length)), 0, key);
      return { ...l, tabs, activeKey: key };
    });
  }
  const removed = removeTab(tree, key);
  if (!removed) return null;
  return mapLeaves(removed, (l) => {
    if (l.id !== leafId) return l;
    const tabs = [...l.tabs];
    tabs.splice(Math.max(0, Math.min(index, tabs.length)), 0, key);
    return { ...l, tabs, activeKey: key };
  });
}

// Split leaf `leafId` at `zone` and put `key` alone in the new half. The key
// leaves any leaf that held it. The tree comes back unchanged when the key is
// already the only tab of that leaf (a split onto itself) or the leaf is gone.
export function splitAt(
  tree: TabPanelNode,
  key: string,
  leafId: string,
  zone: Exclude<TabPanelDropZone, 'center'>,
): TabPanelNode {
  const before = collectLeavesById(tree, leafId);
  if (!before) return tree;
  if (before.tabs.length === 1 && before.tabs[0] === key) return tree;
  const removed = removeTab(tree, key);
  if (!removed) return tree;
  const target = collectLeavesById(removed, leafId);
  if (!target) return tree;
  const newLeaf = makeLeaf([key], key);
  const direction: TabPanelDirection =
    zone === 'left' || zone === 'right' ? 'row' : 'column';
  const leading = zone === 'left' || zone === 'top';
  const split: TabPanelSplit = {
    kind: 'split',
    direction,
    ratio: 0.5,
    first: leading ? newLeaf : target,
    second: leading ? target : newLeaf,
  };
  return replaceLeaf(removed, leafId, split);
}
