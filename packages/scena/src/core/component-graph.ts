import type { ComponentNode } from '../types/component-graph.js';
import { isComponentNode } from '../types/component-graph.js';

// Recursive tree walk. Visits the root, then every nested ComponentNode found
// anywhere in its prop values (single child, child array, or deeper nesting).
export function walk(
  node: ComponentNode,
  visit: (node: ComponentNode, parent: ComponentNode | null) => void,
): void {
  visit(node, null);
  walkChildren(node);

  function walkChildren(current: ComponentNode): void {
    for (const [k, v] of Object.entries(current)) {
      if (k === 'id' || k === 'component' || k === '$meta') continue;
      walkValue(v, current);
    }
  }

  function walkValue(v: unknown, parent: ComponentNode): void {
    if (v === null || typeof v !== 'object') return;
    if (isComponentNode(v)) {
      visit(v, parent);
      walkChildren(v);
      return;
    }
    if (Array.isArray(v)) {
      for (const item of v) walkValue(item, parent);
      return;
    }
    // Plain object — recurse into its values (children inside { template } etc).
    for (const inner of Object.values(v as Record<string, unknown>)) {
      walkValue(inner, parent);
    }
  }
}

export function clone(node: ComponentNode): ComponentNode {
  return JSON.parse(JSON.stringify(node)) as ComponentNode;
}

let idCounter = 0;
function nextId(): string {
  idCounter += 1;
  return `n_${Date.now().toString(36)}_${idCounter.toString(36)}`;
}

export function addIds(node: ComponentNode): ComponentNode {
  const out = clone(node);
  walk(out, (n) => {
    if (!n.id) n.id = nextId();
  });
  return out;
}

export function findById(node: ComponentNode, id: string): ComponentNode | null {
  let found: ComponentNode | null = null;
  walk(node, (n) => {
    if (found) return;
    if (n.id === id) found = n;
  });
  return found;
}

// Deep-clones the node with every `$meta` key removed. Use this before
// serializing a node back to a sender: `$meta` annotates origin/editor data
// that the sender never sent and should never receive.
export function stripMeta(node: ComponentNode): ComponentNode {
  return stripValue(node) as ComponentNode;
}

function stripValue(v: unknown): unknown {
  if (v === null || typeof v !== 'object') return v;
  if (Array.isArray(v)) return v.map(stripValue);
  const out: Record<string, unknown> = {};
  for (const [k, inner] of Object.entries(v as Record<string, unknown>)) {
    if (k === '$meta') continue;
    out[k] = stripValue(inner);
  }
  return out;
}
