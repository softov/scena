import {
  type CSSProperties,
  type DragEvent as ReactDragEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { BindingPath } from '../../types/component-graph.js';
import { ContextMenu } from '../menu/ContextMenu.js';
import './Listable.css';

// Generic responsive list/table for a flat `T[]`. Below `tableBreakpoint`
// renders a stacked "list row" per item; above it switches to a CSS-grid
// table with sortable headers. Pairs with Tree for hierarchical data.

// Passed to every column.render(item, ctx). Lets a column branch on
// whether the container is wide enough to show its peers or not — e.g.
// the `name` column can fold in the email when ctx.tableMode is false.
export interface ListableRenderContext {
  tableMode: boolean;
  containerWidth: number;
}

export interface ListableColumn<T> {
  // Stable id; doubles as the default sort key.
  key: string;
  // Header label in table mode; tag label in the stacked list fallback.
  label: ReactNode;
  // Cell renderer. Receives the item and a render context — `ctx.tableMode`
  // is false in the narrow stacked fallback, true in the wide table.
  render: (item: T, ctx: ListableRenderContext) => ReactNode;

  // Visibility — three independent axes:
  //   hidden: true       → never shown (still indexable for outside sort).
  //   mode: 'table'      → only shown when the container is wide enough.
  //   mode: 'list' | ø   → shown in both modes (default).
  //   visible?(item)     → per-row predicate; when false the cell renders
  //                        blank but its column slot stays allocated so the
  //                        grid alignment doesn't break.
  hidden?: boolean;
  mode?: 'list' | 'table';
  visible?: (item: T) => boolean;

  // Sort opt-in:
  //   true             → default comparator (numbers subtract, others
  //                      localeCompare on String(value at key)).
  //   (a, b) => number → custom comparator.
  //   falsy            → not sortable; header has no click affordance.
  sortable?: boolean | ((a: T, b: T) => number);

  align?: 'left' | 'right';
  // CSS Grid track for table mode (e.g. `'90px'`, `'minmax(120px,1fr)'`).
  // Default `'minmax(0, 1fr)'` — column shares the row's width evenly with
  // its siblings. Use explicit widths to anchor a narrow lead column.
  width?: string;
  // Hide this column until the container is at least `showAt` px wide —
  // finer-grained than `mode: 'table'`. e.g. Provider from 400, Agents from 500.
  showAt?: number;
  style?: CSSProperties;
}

export interface ListableSort {
  key: string;
  direction: 'asc' | 'desc';
}

export interface ListableProps<T> {
  items: T[];
  columns: ListableColumn<T>[];
  // Stable id-extractor for React keys + selection.
  getKey: (item: T) => string;

  // Header slots above the rows.
  title?: ReactNode;
  toolbar?: ReactNode;

  // Selection (controlled).
  selectedKey?: string | null;
  onSelect?: (item: T) => void;
  // Enter / double-click — semantically "open this".
  onActivate?: (item: T) => void;

  // Sort — controlled vs uncontrolled:
  //   - omit `sort` + optionally pass `initialSort`        → uncontrolled.
  //   - pass `sort` + `onSortChange` (pass `null` for off) → controlled.
  initialSort?: ListableSort;
  sort?: ListableSort | null;
  onSortChange?: (next: ListableSort | null) => void;

  // Pixel breakpoint above which Listable switches from list to table.
  // Default 480.
  tableBreakpoint?: number;
  // Optional override for the stacked list row. When absent, Listable
  // auto-stacks each visible non-table column as `label: value`.
  renderListRow?: (item: T) => ReactNode;

  // Right-click → ContextMenu (mirrors Tree's wiring).
  contextMenuSlot?: string;
  contextFor?: (item: T) => Record<string, unknown>;
  contextDataContext?: BindingPath;

  // Row drag source (mirrors Tree). When set, rows are draggable and this
  // fires on dragstart so the host can populate dataTransfer.
  onRowDragStart?: (e: ReactDragEvent<HTMLElement>, item: T) => void;

  emptyState?: ReactNode;
  className?: string;
  style?: CSSProperties;

  // if true, Listable handles arrow key navigation and Enter activation on rows.
  manageKeys?: boolean;
}

function getValueAt<T>(item: T, key: string): unknown {
  if (item == null || typeof item !== 'object') return undefined;
  return (item as Record<string, unknown>)[key];
}

function defaultCompare<T>(a: T, b: T, key: string): number {
  const va = getValueAt(a, key);
  const vb = getValueAt(b, key);
  if (va == null && vb == null) return 0;
  if (va == null) return -1;
  if (vb == null) return 1;
  if (typeof va === 'number' && typeof vb === 'number') return va - vb;
  return String(va).localeCompare(String(vb));
}

function sortItems<T>(
  items: T[],
  columns: ListableColumn<T>[],
  sort: ListableSort | null,
): T[] {
  if (!sort) return items;
  const col = columns.find((c) => c.key === sort.key);
  if (!col || !col.sortable) return items;
  const cmp =
    typeof col.sortable === 'function'
      ? col.sortable
      : (a: T, b: T) => defaultCompare(a, b, col.key);
  const sign = sort.direction === 'asc' ? 1 : -1;
  return [...items].sort((a, b) => sign * cmp(a, b));
}

const DEFAULT_TABLE_BREAKPOINT = 480;

export function Listable<T>({
  items,
  columns,
  getKey,
  title,
  toolbar,
  selectedKey,
  onSelect,
  onActivate,
  initialSort,
  sort,
  onSortChange,
  tableBreakpoint = DEFAULT_TABLE_BREAKPOINT,
  renderListRow,
  contextMenuSlot,
  contextFor,
  contextDataContext,
  onRowDragStart,
  emptyState,
  className,
  style,
  manageKeys = false,
}: ListableProps<T>): ReactNode {
  const rootRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [internalSort, setInternalSort] = useState<ListableSort | null>(initialSort ?? null);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      if (entry) setContainerWidth(entry.contentRect.width);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const tableMode = containerWidth >= tableBreakpoint;
  const sortControlled = sort !== undefined;
  const activeSort = sortControlled ? sort : internalSort;

  const visibleColumns = useMemo(
    () =>
      columns.filter(
        (c) =>
          !c.hidden &&
          (tableMode || c.mode !== 'table') &&
          (c.showAt == null || containerWidth >= c.showAt),
      ),
    [columns, tableMode, containerWidth],
  );

  const gridTemplate = useMemo(
    () => visibleColumns.map((c) => c.width ?? 'minmax(0, 1fr)').join(' '),
    [visibleColumns],
  );

  const sortedItems = useMemo(
    () => sortItems(items, columns, activeSort ?? null),
    [items, columns, activeSort],
  );

  const renderCtx: ListableRenderContext = useMemo(
    () => ({ tableMode, containerWidth }),
    [tableMode, containerWidth],
  );

  function handleHeaderClick(col: ListableColumn<T>): void {
    if (!col.sortable) return;
    const cur = activeSort;
    const next: ListableSort | null =
      !cur || cur.key !== col.key
        ? { key: col.key, direction: 'asc' }
        : cur.direction === 'asc'
        ? { key: col.key, direction: 'desc' }
        : null;
    if (sortControlled) onSortChange?.(next);
    else setInternalSort(next);
  }

  // Scroll the selected row into view when it changes externally.
  useEffect(() => {
    if (!selectedKey || !rootRef.current) return;
    const row = rootRef.current.querySelector<HTMLElement>(
      `[data-key="${cssEscape(selectedKey)}"]`,
    );
    if (row) row.scrollIntoView({ block: 'nearest' });
  }, [selectedKey]);

  // ── Keyboard ───────────────────────────────────────────────────────────
  const selectedIndex = selectedKey
    ? sortedItems.findIndex((it) => getKey(it) === selectedKey)
    : -1;

  function handleKeyDown(e: ReactKeyboardEvent<HTMLDivElement>): void {
    if (sortedItems.length === 0) return;
    const cur = selectedIndex >= 0 ? selectedIndex : 0;
    switch (e.key) {
      case 'ArrowDown': {
        e.preventDefault();
        const next = sortedItems[Math.min(sortedItems.length - 1, cur + 1)];
        if (next) onSelect?.(next);
        return;
      }
      case 'ArrowUp': {
        e.preventDefault();
        const next = sortedItems[Math.max(0, cur - 1)];
        if (next) onSelect?.(next);
        return;
      }
      case 'Enter':
      case ' ': {
        e.preventDefault();
        const it = sortedItems[cur];
        if (it) onActivate?.(it);
        return;
      }
    }
  }

  // ── Context menu ───────────────────────────────────────────────────────
  const [menu, setMenu] = useState<null | { x: number; y: number; item: T }>(null);

  function openContextMenu(e: ReactMouseEvent<HTMLDivElement>, item: T): void {
    if (!contextMenuSlot) return;
    e.preventDefault();
    e.stopPropagation();
    // onSelect?.(item);
    setMenu({ x: e.clientX, y: e.clientY, item });
  }

  // ── Render helpers ─────────────────────────────────────────────────────
  function renderCellContent(col: ListableColumn<T>, item: T): ReactNode {
    if (col.visible && !col.visible(item)) return null;
    return col.render(item, renderCtx);
  }

  function renderTableRow(item: T): ReactNode {
    const key = getKey(item);
    const selected = key === selectedKey;
    return (
      <div
        key={key}
        role="row"
        data-key={key}
        data-selected={selected ? 'true' : undefined}
        className="oo-listable__item oo-listable__row"
        draggable={onRowDragStart ? true : undefined}
        onDragStart={onRowDragStart ? (e) => onRowDragStart(e, item) : undefined}
        onClick={() => {
          onSelect?.(item);
        }}
        onDoubleClick={() => onActivate?.(item)}
        onContextMenu={(e) => openContextMenu(e, item)}
        style={{
          cursor: onSelect ? 'pointer' : undefined
        }}
      >
        {visibleColumns.map((col) => (
          <div
            key={col.key}
            role="cell"
            className="oo-listable__cell"
            data-align={col.align ?? 'left'}
          >
            {renderCellContent(col, item)}
          </div>
        ))}
      </div>
    );
  }

  function renderStackedRow(item: T): ReactNode {
    const key = getKey(item);
    const selected = key === selectedKey;
    return (
      <div
        key={key}
        role="row"
        data-key={key}
        data-selected={selected ? 'true' : undefined}
        className="oo-listable__item oo-listable__stack"
        draggable={onRowDragStart ? true : undefined}
        onDragStart={onRowDragStart ? (e) => onRowDragStart(e, item) : undefined}
        onClick={() => onSelect?.(item)}
        onDoubleClick={() => onActivate?.(item)}
        onContextMenu={(e) => openContextMenu(e, item)}
        style={{
          cursor: onSelect ? 'pointer' : undefined
        }}
      >
        {renderListRow
          ? renderListRow(item)
          : visibleColumns.map((col) => {
              const content = renderCellContent(col, item);
              if (content == null) return null;
              return (
                <div key={col.key} className="oo-listable__list-cell" style={col.style}>
                  {/* <span className="oo-listable__list-label">{col.label}</span> */}
                  <span className="oo-listable__list-value">{content}</span>
                </div>
              );
            })}
      </div>
    );
  }

  return (
    <div
      ref={rootRef}
      role="table"
      tabIndex={0}
      className={['oo-listable', className].filter(Boolean).join(' ')}
      data-mode={tableMode ? 'table' : 'list'}
      style={style}
      onKeyDown={manageKeys ? handleKeyDown : undefined}
    >
      {title || toolbar ? (
        <header className="oo-listable__header">
          {title ? <h2 className="oo-listable__title">{title}</h2> : null}
          {toolbar}
        </header>
      ) : null}

      {sortedItems.length === 0 ? (
        <div className="oo-listable__empty">{emptyState ?? 'Empty'}</div>
      ) : (
        // Single grid container in table mode — head-row and every data row
        // are subgrids that inherit these column tracks, so `auto`/`minmax`
        // sizing is shared and head cells align with their data cells.
        <div
          className="oo-listable__rows"
          role="rowgroup"
          style={
            tableMode
              ? ({ ['--oo-listable-template' as string]: gridTemplate } as CSSProperties)
              : undefined
          }
        >
          {tableMode ? (
            <div role="row" className="oo-listable__head-row">
              {visibleColumns.map((col) => {
                const isSorted = activeSort?.key === col.key;
                return (
                  <div
                    key={col.key}
                    role="columnheader"
                    className="oo-listable__head-cell"
                    data-align={col.align ?? 'left'}
                    data-sortable={col.sortable ? 'true' : undefined}
                    data-sorted={isSorted ? activeSort!.direction : undefined}
                    title={col.sortable && typeof col.label === 'string' ? `Sort by ${col.label}` : undefined}
                    onClick={col.sortable ? () => handleHeaderClick(col) : undefined}
                  >
                    <span className="oo-listable__head-label">{col.label}</span>
                    {isSorted ? (
                      <span className="oo-listable__sort-arrow" aria-hidden="true">
                        {activeSort!.direction === 'asc' ? '▲' : '▼'}
                      </span>
                    ) : null}
                  </div>
                );
              })}
            </div>
          ) : null}

          {sortedItems.map((it) => (tableMode ? renderTableRow(it) : renderStackedRow(it)))}
        </div>
      )}

      {menu && contextMenuSlot ? (
        <ContextMenu
          x={menu.x}
          y={menu.y}
          onClose={() => setMenu(null)}
          spec={{ query: { slot: contextMenuSlot }, footerHints: true }}
          context={contextFor ? contextFor(menu.item) : undefined}
          dataContext={contextDataContext}
        />
      ) : null}
    </div>
  );
}

// Cheap CSS-selector escape so a key with `"` or `]` doesn't break the
// querySelector used by scrollIntoView. Same shape as Tree.tsx.
function cssEscape(s: string): string {
  return s.replace(/(["\\\]])/g, '\\$1');
}
