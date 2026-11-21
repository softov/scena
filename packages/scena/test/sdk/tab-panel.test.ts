import { describe, it, expect } from 'vitest';
import {
  collectLeaves,
  placeTab,
  reconcile,
  removeTab,
  splitAt,
} from '../../src/sdk/tab-panel.js';
import type { TabPanelLeaf, TabPanelNode } from '../../src/sdk/layout.js';

const leaf = (id: string, tabs: string[], activeKey = tabs[0]): TabPanelLeaf => ({
  kind: 'leaf',
  id,
  tabs,
  activeKey,
});

const twoGroups = (): TabPanelNode => ({
  kind: 'split',
  direction: 'row',
  ratio: 0.5,
  first: leaf('g1', ['a', 'b']),
  second: leaf('g2', ['c']),
});

const leaves = (tree: TabPanelNode | null): TabPanelLeaf[] => {
  const out: TabPanelLeaf[] = [];
  if (tree) collectLeaves(tree, out);
  return out;
};

describe('removeTab', () => {
  it('takes the key out of its leaf and moves the active tab on', () => {
    const tree = removeTab(twoGroups(), 'a');
    expect(leaves(tree)[0]).toMatchObject({ id: 'g1', tabs: ['b'], activeKey: 'b' });
  });

  it('drops a leaf it empties, and the split collapses to the sibling', () => {
    expect(removeTab(twoGroups(), 'c')).toMatchObject({ kind: 'leaf', id: 'g1', tabs: ['a', 'b'] });
  });

  it('returns null when the last tab of the last leaf goes', () => {
    expect(removeTab(leaf('g1', ['a']), 'a')).toBeNull();
  });
});

describe('placeTab', () => {
  it('reorders a key inside its own leaf', () => {
    const tree = placeTab(leaf('g1', ['a', 'b', 'c']), 'a', 'g1', 3);
    expect(tree).toMatchObject({ tabs: ['b', 'c', 'a'], activeKey: 'a' });
  });

  it('moves a key from another leaf, which goes when emptied', () => {
    const tree = placeTab(twoGroups(), 'c', 'g1', 1);
    expect(tree).toMatchObject({ kind: 'leaf', id: 'g1', tabs: ['a', 'c', 'b'], activeKey: 'c' });
  });

  it('adds a key that no leaf holds, as a tab from another surface', () => {
    const tree = placeTab(twoGroups(), 'x', 'g2', 0);
    expect(leaves(tree)[1]).toMatchObject({ id: 'g2', tabs: ['x', 'c'], activeKey: 'x' });
    expect(leaves(tree)[0]?.tabs).toEqual(['a', 'b']);
  });

  it('clamps the index to the strip', () => {
    expect(leaves(placeTab(twoGroups(), 'x', 'g2', 99))[1]?.tabs).toEqual(['c', 'x']);
    expect(leaves(placeTab(twoGroups(), 'x', 'g2', -5))[1]?.tabs).toEqual(['x', 'c']);
  });

  it('returns null for a leaf the tree does not hold', () => {
    expect(placeTab(twoGroups(), 'x', 'nope', 0)).toBeNull();
  });
});

describe('splitAt', () => {
  it.each([
    ['left', 'row', true],
    ['right', 'row', false],
    ['top', 'column', true],
    ['bottom', 'column', false],
  ] as const)('splits at %s', (zone, direction, leading) => {
    const tree = splitAt(leaf('g1', ['a', 'b']), 'b', 'g1', zone);
    expect(tree).toMatchObject({ kind: 'split', direction, ratio: 0.5 });
    const [first, second] = leaves(tree);
    const fresh = leading ? first : second;
    const kept = leading ? second : first;
    expect(fresh).toMatchObject({ tabs: ['b'], activeKey: 'b' });
    expect(kept).toMatchObject({ id: 'g1', tabs: ['a'] });
  });

  it('puts a key from another surface in the new half', () => {
    const [, fresh] = leaves(splitAt(leaf('g1', ['a']), 'x', 'g1', 'right'));
    expect(fresh?.tabs).toEqual(['x']);
  });

  it('leaves the tree as it is for the only tab of a leaf on its own edge', () => {
    const tree = leaf('g1', ['a']);
    expect(splitAt(tree, 'a', 'g1', 'right')).toBe(tree);
  });
});

describe('reconcile', () => {
  it('prunes keys that are not mounted and appends new ones to the focused leaf', () => {
    const { tree } = reconcile(twoGroups(), ['a', 'c', 'n'], 'c');
    const [g1, g2] = leaves(tree);
    expect(g1?.tabs).toEqual(['a']);
    expect(g2).toMatchObject({ tabs: ['c', 'n'], activeKey: 'c' });
  });

  it('builds one leaf when there is no tree yet', () => {
    expect(reconcile(undefined, ['a', 'b'], 'b').tree).toMatchObject({ kind: 'leaf', tabs: ['a', 'b'], activeKey: 'b' });
  });
});
