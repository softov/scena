import {
  type ClipboardEvent as ReactClipboardEvent,
  type CSSProperties,
  type DragEvent as ReactDragEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { BindingPath } from '../../types/component-graph.js';
import type { PickerAction } from '../../types/host.js';
import { ContextMenu } from '../menu/ContextMenu.js';
import './Tree.css';
import { resolveColorVar } from '../../types/colors.js';

// Generic hierarchical tree. Controlled selection + expansion, kbd nav,
// optional right-click ContextMenu, optional drag-drop and clipboard hooks.
// Used by the file explorer demo and any future "explorer of N things"
// surface. Pairs with Listable for flat-list cases.

export interface TreeNode<T = unknown> {
  key: string;
  // Display content for the row. Strings render plain; ReactNode renders as-is.
  label: ReactNode;
  // Optional leading glyph; respects scena's `data-cmd-group` + color
  // conventions so a registered resource color flows through.
  icon?: string;
  color?: string;
  // Optional trailing slot (counts, badges, hover actions). Caller-controlled.
  trailing?: ReactNode;
  // App-side payload. Pass anything you want to receive back in callbacks.
  data?: T;
  // Children — undefined means this node is a leaf; empty array means it's a
  // branch that's currently empty (still renders the disclosure twisty).
  children?: TreeNode<T>[];
  // Drag/drop opt-in per node.
  draggable?: boolean;
  // Hint that this node accepts drops. The caller still validates in onDrop.
  dropAccepting?: boolean;
}

export interface TreeProps<T = unknown> {
  nodes: TreeNode<T>[];
  // Optional title slot above the tree (acts like Listable.title).
  title?: ReactNode;
  toolbar?: ReactNode;

  // Selection.
  selectedKey?: string | null;
  onSelect?: (node: TreeNode<T>) => void;
  // Fires on Enter / double-click — semantically "open this".
  onActivate?: (node: TreeNode<T>) => void;

  // Expansion. Either fully controlled (pass `expanded` + `onExpandedChange`)
  // or uncontrolled (omit both, optionally pass `defaultExpanded`).
  expanded?: Set<string>;
  defaultExpanded?: Iterable<string>;
  onExpandedChange?: (next: Set<string>) => void;

  // Per-row body override. Receives node + a small ctx with selected/expanded.
  // When omitted, the default row renders `icon + label + trailing`.
  renderItem?: (node: TreeNode<T>, ctx: { selected: boolean; expanded: boolean; depth: number }) => ReactNode;

  // Right-click → ContextMenu at slot, with per-node context injection.
  contextMenuSlot?: string;
  contextFor?: (node: TreeNode<T>) => Record<string, unknown>;
  contextDataContext?: BindingPath;
  // Extra rows prepended to the right-click menu, built per-node at open time —
  // e.g. registry-derived "Open with <viewer>" actions. Rendered ahead of the
  // slot commands (ListSpec.extraItems).
  contextExtraItems?: (node: TreeNode<T>) => PickerAction[];

  // Drag/drop hooks. Tree wires the standard onDragStart/onDragOver/onDrop
  // on each row; the host decides what to do.
  onDragStart?: (e: ReactDragEvent<HTMLDivElement>, node: TreeNode<T>) => void;
  onDragOver?: (e: ReactDragEvent<HTMLDivElement>, node: TreeNode<T>) => void;
  onDragEnd?: (e: ReactDragEvent<HTMLDivElement>, node: TreeNode<T>) => void;
  onDrop?: (e: ReactDragEvent<HTMLDivElement>, node: TreeNode<T>) => void;

  // Clipboard hooks on the whole tree. Browser fires copy/paste events at the
  // focused element; Tree owns focus so these surface here.
  onCopy?: (e: ReactClipboardEvent<HTMLDivElement>, node: TreeNode<T> | null) => void;
  onPaste?: (e: ReactClipboardEvent<HTMLDivElement>, node: TreeNode<T> | null) => void;

  // Empty state if nodes is empty.
  emptyState?: ReactNode;

  className?: string;
  style?: CSSProperties;
}

interface FlatRow<T> {
  node: TreeNode<T>;
  depth: number;
  hasChildren: boolean;
  expanded: boolean;
  parentKey: string | null;
}

function flatten<T>(
  nodes: TreeNode<T>[],
  expanded: Set<string>,
  depth = 0,
  parentKey: string | null = null,
  out: FlatRow<T>[] = [],
): FlatRow<T>[] {
  for (const n of nodes) {
    const hasChildren = n.children !== undefined;
    const isExpanded = hasChildren && expanded.has(n.key);
    out.push({ node: n, depth, hasChildren, expanded: isExpanded, parentKey });
    if (isExpanded && n.children) flatten(n.children, expanded, depth + 1, n.key, out);
  }
  return out;
}

export function Tree<T = unknown>({
  nodes,
  title,
  toolbar,
  selectedKey,
  onSelect,
  onActivate,
  expanded: controlledExpanded,
  defaultExpanded,
  onExpandedChange,
  renderItem,
  contextMenuSlot,
  contextFor,
  contextDataContext,
  contextExtraItems,
  onDragStart,
  onDragOver,
  onDragEnd,
  onDrop,
  onCopy,
  onPaste,
  emptyState,
  className,
  style,
}: TreeProps<T>): ReactNode {
  // Expansion state — controlled vs uncontrolled.
  const [internalExpanded, setInternalExpanded] = useState<Set<string>>(
    () => new Set(defaultExpanded ?? []),
  );
  const expanded = controlledExpanded ?? internalExpanded;
  const setExpanded = useCallback(
    (next: Set<string>) => {
      if (onExpandedChange) onExpandedChange(next);
      if (controlledExpanded === undefined) setInternalExpanded(next);
    },
    [controlledExpanded, onExpandedChange],
  );

  const flat = useMemo(() => flatten(nodes, expanded), [nodes, expanded]);

  // Context-menu state per click.
  const [menu, setMenu] = useState<null | { x: number; y: number; node: TreeNode<T> }>(null);

  // Which drop-accepting row is currently under the drag (for the drop outline).
  const [dragOverKey, setDragOverKey] = useState<string | null>(null);

  function handleRowDragOver(e: ReactDragEvent<HTMLDivElement>, node: TreeNode<T>): void {
    onDragOver?.(e, node);
    if (node.dropAccepting) setDragOverKey(node.key);
  }
  function handleRowDragLeave(e: ReactDragEvent<HTMLDivElement>, node: TreeNode<T>): void {
    // Drag events bubble through child elements; ignore leaves that stay inside the row.
    if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
    setDragOverKey((k) => (k === node.key ? null : k));
  }
  function handleRowDrop(e: ReactDragEvent<HTMLDivElement>, node: TreeNode<T>): void {
    setDragOverKey(null);
    onDrop?.(e, node);
  }

  // Scroll the selected row into view when it changes externally.
  const rootRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!selectedKey || !rootRef.current) return;
    const row = rootRef.current.querySelector<HTMLElement>(`[data-key="${cssEscape(selectedKey)}"]`);
    if (row) row.scrollIntoView({ block: 'nearest' });
  }, [selectedKey]);

  function toggleExpand(key: string): void {
    const next = new Set(expanded);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setExpanded(next);
  }

  // ----- Keyboard -----
  const selectedIndex = selectedKey
    ? flat.findIndex((r) => r.node.key === selectedKey)
    : -1;

  function handleKeyDown(e: ReactKeyboardEvent<HTMLDivElement>): void {
    if (flat.length === 0) return;
    const cur = selectedIndex >= 0 ? selectedIndex : 0;
    const row = flat[cur];
    switch (e.key) {
      case 'ArrowDown': {
        e.preventDefault();
        const next = flat[Math.min(flat.length - 1, cur + 1)];
        if (next) onSelect?.(next.node);
        return;
      }
      case 'ArrowUp': {
        e.preventDefault();
        const next = flat[Math.max(0, cur - 1)];
        if (next) onSelect?.(next.node);
        return;
      }
      case 'ArrowRight': {
        e.preventDefault();
        if (!row) return;
        if (row.hasChildren && !row.expanded) {
          toggleExpand(row.node.key);
        } else if (row.hasChildren && row.expanded) {
          const child = flat[cur + 1];
          if (child) onSelect?.(child.node);
        }
        return;
      }
      case 'ArrowLeft': {
        e.preventDefault();
        if (!row) return;
        if (row.hasChildren && row.expanded) {
          toggleExpand(row.node.key);
        } else if (row.parentKey) {
          const parent = flat.find((r) => r.node.key === row.parentKey);
          if (parent) onSelect?.(parent.node);
        }
        return;
      }
      case 'Enter':
      case ' ': {
        e.preventDefault();
        if (!row) return;
        if (row.hasChildren) toggleExpand(row.node.key);
        else onActivate?.(row.node);
        return;
      }
    }
  }

  // Right-click → ContextMenu (when contextMenuSlot is set).
  function openContextMenu(e: ReactMouseEvent<HTMLDivElement>, node: TreeNode<T>): void {
    if (!contextMenuSlot) return;
    e.preventDefault();
    e.stopPropagation();
    onSelect?.(node);
    setMenu({ x: e.clientX, y: e.clientY, node });
  }

  // Clipboard surface — focus owner gets these.
  function onTreeCopy(e: ReactClipboardEvent<HTMLDivElement>): void {
    const node = selectedKey ? flat.find((r) => r.node.key === selectedKey)?.node ?? null : null;
    onCopy?.(e, node);
  }
  function onTreePaste(e: ReactClipboardEvent<HTMLDivElement>): void {
    const node = selectedKey ? flat.find((r) => r.node.key === selectedKey)?.node ?? null : null;
    onPaste?.(e, node);
  }

  return (
    <div
      ref={rootRef}
      role="tree"
      tabIndex={0}
      className={['oo-tree', className].filter(Boolean).join(' ')}
      style={style}
      onKeyDown={handleKeyDown}
      onCopy={onCopy ? onTreeCopy : undefined}
      onPaste={onPaste ? onTreePaste : undefined}
      onDragEnd={() => setDragOverKey(null)}
    >
      {title || toolbar ? (
        <header className="oo-tree__header">
          {title ? <h2 className="oo-tree__title">{title}</h2> : null}
          {toolbar}
        </header>
      ) : null}

      {flat.length === 0 ? (
        <div className="oo-tree__empty">{emptyState ?? 'Empty'}</div>
      ) : (
        <div className="oo-tree__rows" role="presentation">
          {flat.map((row) => {
            const { node, depth, hasChildren, expanded: rowExpanded } = row;
            const selected = node.key === selectedKey;
            return (
              <div
                key={node.key}
                role="treeitem"
                aria-level={depth + 1}
                aria-expanded={hasChildren ? rowExpanded : undefined}
                aria-selected={selected}
                data-key={node.key}
                data-selected={selected ? 'true' : undefined}
                data-drag-over={node.key === dragOverKey ? 'true' : undefined}
                tabIndex={-1}
                draggable={node.draggable ?? false}
                className={`oo-tree__row ${node.draggable ? 'oo-draggable' : ''}`}
                style={{ paddingLeft: depth * 14 + 6 }}
                onClick={() => onSelect?.(node)}
                onDoubleClick={() => {
                  if (hasChildren) toggleExpand(node.key);
                  else onActivate?.(node);
                }}
                onContextMenu={(e) => openContextMenu(e, node)}
                onDragStart={onDragStart ? (e) => onDragStart(e, node) : undefined}
                onDragOver={onDragOver ? (e) => handleRowDragOver(e, node) : undefined}
                onDragLeave={onDragOver ? (e) => handleRowDragLeave(e, node) : undefined}
                onDragEnd={onDragEnd ? (e) => onDragEnd(e, node) : undefined}
                onDrop={onDrop ? (e) => handleRowDrop(e, node) : undefined}
              >
                {hasChildren ? (
                  <button
                    type="button"
                    aria-label={rowExpanded ? 'Collapse' : 'Expand'}
                    className="oo-tree__twisty"
                    data-expanded={rowExpanded ? 'true' : undefined}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleExpand(node.key);
                    }}
                  >
                    ▸
                  </button>
                ) : (
                  <span className="oo-tree__twisty oo-tree__twisty--leaf" />
                )}
                {renderItem ? (
                  renderItem(node, { selected, expanded: rowExpanded, depth })
                ) : (
                  <DefaultRowBody node={node} />
                )}
              </div>
            );
          })}
        </div>
      )}

      {menu && contextMenuSlot ? (
        <ContextMenu
          x={menu.x}
          y={menu.y}
          onClose={() => setMenu(null)}
          spec={{ query: { slot: contextMenuSlot }, extraItems: contextExtraItems ? contextExtraItems(menu.node) : undefined, footerHints: true }}
          context={contextFor ? contextFor(menu.node) : undefined}
          dataContext={contextDataContext}
        />
      ) : null}
    </div>
  );
}

function DefaultRowBody<T>({ node }: { node: TreeNode<T> }) {
  const iconStyle = node.color
    ? ({ ['--oo-color' as string]: resolveColorVar(node.color) } as CSSProperties)
    : undefined;
  return (
    <>
      <span className="oo-icon oo-tree__icon" style={iconStyle}>
        {node.icon ?? '·'}
      </span>
      <span className="oo-tree__label">{node.label}</span>
      {node.trailing ? <span className="oo-tree__trailing">{node.trailing}</span> : null}
    </>
  );
}

// Cheap CSS-selector escape so a node key with `"` or `]` doesn't break the
// querySelector used by scrollIntoView. Avoids a full polyfill.
function cssEscape(s: string): string {
  return s.replace(/(["\\\]])/g, '\\$1');
}
