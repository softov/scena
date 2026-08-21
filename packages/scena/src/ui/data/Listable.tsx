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
import type { BindingPath } from '../../sdk/component-graph.js';
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

// What a column may say about one of its cells, per row. Deliberately the DOM
// props that carry layout rather than a free-form spread: a cell that could
// take arbitrary props could take `key`, `role` or `onClick`, and silently
// break the grid, the a11y tree, or selection.
//
// No `title` here. The tooltip is per-row text, not styling, and folding it in
// meant one function returned both the thing a `className` styles and a string
// that class can never reach. `titleProps` owns it instead.
export interface ListableCellProps {
  style?: CSSProperties;
  className?: string;
}

// Everything about a column's title: the header label and the cell tooltip.
//
// One function rather than a field plus a function, because they answer the
// same question — what this column is called and whether it is worth saying
// here. A column that moves its cells to a second row usually wants the header
// gone and the tooltip kept, and that is one decision, made once.
export interface ListableTitleProps {
  // The cell's tooltip. Worth setting on any column whose text is routinely
  // wider than its track: cells are `text-overflow: ellipsis`, so without it
  // the full value is unreachable at narrow widths.
  title?: string;
  // Drop the header label while keeping the header cell.
  //
  // The cell has to stay: it is a grid slot, and removing it would shift every
  // header after it one track left of the data it names. Hiding is what a
  // column wants once its cells have moved to a second row — that track
  // collapses to nothing, and a heading floating over nothing is worse than no
  // heading at all.
  hidden?: boolean;
  style?: CSSProperties;
  className?: string;
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

  // Per-row cell props, computed from the item and the measured container.
  //
  // Pure and called during render, so it must not write state — that is the
  // whole reason it returns props instead of taking a setter.
  //
  // What it is for is a row that is more than one line. Say where each cell
  // goes and the row becomes a grid rather than a sequence:
  //
  //   { style: { gridRow: 2, gridColumn: '1 / span 4' } }
  //
  // Two rules come with that. Place every cell, not some: an explicitly placed
  // item and an auto-placed one share a cursor, and the auto ones land wherever
  // the explicit ones left it. And zero the `width` of every column whose cells
  // now sit on another column's track — the track is still emitted, one per
  // visible column, and an unclaimed `1fr` would take a share of the row.
  //
  // For anything expressible in a stylesheet, prefer returning a `className`
  // and writing an `@container` query: `.oo-listable` is a size container, so
  // the CSS reacts during a resize drag without a render.
  cellProps?: (item: T, ctx: ListableRenderContext) => ListableCellProps;

  // The column's title: its header label and its cells' tooltip.
  //
  // `item` is the row for a cell's tooltip, and undefined when the header asks
  // — the header is one cell for the whole column and has no row to speak of.
  titleProps?: (item: T | undefined, ctx: ListableRenderContext) => ListableTitleProps;

  align?: 'left' | 'right';
  // CSS Grid track for table mode (e.g. `'90px'`, `'minmax(120px,1fr)'`).
  // Default `'minmax(0, 1fr)'` — column shares the row's width evenly with
  // its siblings. Use explicit widths to anchor a narrow lead column.
  //
  // As a function, the track follows the measured container, so a column can
  // trade width for room instead of disappearing:
  //
  //   width: (ctx) => (ctx.containerWidth < 520 ? '90px' : 'minmax(0, 1fr)'),
  //
  // `'0'` for a column whose cells are placed by hand onto another column's
  // track: the track is still emitted — it is one per visible column — and an
  // unclaimed `1fr` would otherwise take a share of the row and leave a gap.
  width?: string | ((ctx: ListableRenderContext) => string);
  // Hide this column until the container is at least `showAt` px wide —
  // finer-grained than `mode: 'table'`. e.g. Provider from 400, Agents from 500.
  showAt?: number;

  // Static cell style, merged under whatever `cellProps` returns for the row.
  // Applies in both modes.
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

  // Optional per-row style. Merged under the cellProps of each column.
  getRowStyle?: (item: T, renderCtx: ListableRenderContext) => CSSProperties | undefined;

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
  getRowStyle,
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

  // Declared before the track template, which now depends on it: a column's
  // width may be a function of the measured container.
  const renderCtx: ListableRenderContext = useMemo(
    () => ({ tableMode, containerWidth }),
    [tableMode, containerWidth],
  );

  // One track per visible column, in order — so a cell's position in the row
  // is exactly its position in `columns` and nothing has to be placed by hand.
  const gridTemplate = useMemo(
    () =>
      visibleColumns
        .map((c) => (typeof c.width === 'function' ? c.width(renderCtx) : c.width))
        .map((track) => track ?? 'minmax(0, 1fr)')
        .join(' '),
    [visibleColumns, renderCtx],
  );

  const sortedItems = useMemo(
    () => sortItems(items, columns, activeSort ?? null),
    [items, columns, activeSort],
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

  // One table cell. Placement is the cell's own business via `cellProps`; a
  // wrapped cell needs none, because the strip it sits in is what the grid
  // places.
  function renderTableCell(col: ListableColumn<T>, item: T): ReactNode {
    const extra = col.cellProps?.(item, renderCtx);
    // `col.style` was declared and then only ever applied in the stacked row,
    // so a column that set one was silently ignored in table mode. The per-row
    // props win over it, being the more specific of the two.
    const style =
      col.style === undefined && extra?.style === undefined
        ? undefined
        : { ...col.style, ...extra?.style };
    return (
      <div
        key={col.key}
        role="cell"
        className={
          extra?.className === undefined
            ? 'oo-listable__cell'
            : `oo-listable__cell ${extra.className}`
        }
        data-align={col.align ?? 'left'}
        title={col.titleProps?.(item, renderCtx).title}
        // `undefined` rather than `{}` when there is nothing to say: an empty
        // object literal is a new reference on every render, which is a prop
        // change on every cell of every row.
        style={style}
      >
        {renderCellContent(col, item)}
      </div>
    );
  }

  // One header cell.
  function renderHeadCell(col: ListableColumn<T>): ReactNode {
    const isSorted = activeSort?.key === col.key;
    // No row to speak of: the header is one cell for the whole column.
    const head = col.titleProps?.(undefined, renderCtx);
    return (
      <div
        key={col.key}
        role="columnheader"
        className={
          head?.className === undefined
            ? 'oo-listable__head-cell'
            : `oo-listable__head-cell ${head.className}`
        }
        data-align={col.align ?? 'left'}
        data-sortable={col.sortable ? 'true' : undefined}
        data-sorted={isSorted ? activeSort!.direction : undefined}
        title={col.sortable && typeof col.label === 'string' ? `Sort by ${col.label}` : undefined}
        onClick={col.sortable ? () => handleHeaderClick(col) : undefined}
        style={head?.style}
      >
        {/* The cell stays even when the label goes — it is a grid slot, and
            dropping it would shift every header after it one track left of the
            data it names. */}
        {head?.hidden === true ? null : (
          <>
            <span className="oo-listable__head-label">{col.label}</span>
            {isSorted ? (
              <span className="oo-listable__sort-arrow" aria-hidden="true">
                {activeSort!.direction === 'asc' ? '▲' : '▼'}
              </span>
            ) : null}
          </>
        )}
      </div>
    );
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
        {visibleColumns.map((col) => renderTableCell(col, item))}
      </div>
    );
  }

  function renderStackedRow(item: T): ReactNode {
    const key = getKey(item);
    const selected = key === selectedKey;
    const styleRow = getRowStyle ? getRowStyle(item, renderCtx) : undefined;
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
          cursor: onSelect ? 'pointer' : undefined,
          ...styleRow,
        }}
      >
        {renderListRow
          ? renderListRow(item)
          : visibleColumns.map((col) => {
              const content = renderCellContent(col, item);
              if (content == null) return null;
              // Same contract in both modes. `ctx.tableMode` is false here, so
              // a column that only wants to reposition in the table can say so
              // without this branch having to know about it.
              const extra = col.cellProps?.(item, renderCtx);
              return (
                <div
                  key={col.key}
                  className={
                    extra?.className === undefined
                      ? 'oo-listable__list-cell'
                      : `oo-listable__list-cell ${extra.className}`
                  }
                  title={col.titleProps?.(item, renderCtx).title}
                  style={
                    col.style === undefined && extra?.style === undefined
                      ? undefined
                      : { ...col.style, ...extra?.style }
                  }
                >
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
              {visibleColumns.map((col) => renderHeadCell(col))}
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
