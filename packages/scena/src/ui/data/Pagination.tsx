import type { CSSProperties, ReactNode } from 'react';
import { useScena } from '../../react/ScenaProvider.js';
import { useStore } from '../../react/hooks/useStore.js';
import { useI18n } from '../../react/hooks/useI18n.js';
import type { BindingPath } from '../../sdk/component-graph.js';
import type { ListView, Query } from '../../sdk/query.js';

export interface PaginationProps {
  // Resource namespace; reads `$/<namespace>/view` + `$/<namespace>/query`.
  namespace: string;
  // What the label counts.
  //
  //   'items'  1 – 50 of 312          (default)
  //   'pages'  1 / 7
  //
  // `items` is the default because it answers the question people actually
  // have in front of a list: how much is there, and how far in am I. `1 / 7`
  // answers neither without knowing the page size, which is not on screen -
  // and "7 pages" is not a quantity anybody wants to know.
  count?: 'items' | 'pages';
  // Page sizes to offer. Omit for none - the pager then only steps.
  //
  // Changing it returns to page 1 rather than trying to keep the reader where
  // they were: the row that was at the top of page 3 of 50 is not on page 3 of
  // 200, so "keeping" the position would move them somewhere arbitrary and
  // look like a bug.
  pageSizes?: number[];
  // Show the pager even when everything fits. Off by default: a control that
  // can only be pressed to no effect is noise.
  always?: boolean;
}

// Generic pager bound to a resource's query/view. Writes `$/<ns>/query.page`;
// the data provider re-resolves the view (server window or client slice).
export function Pagination({
  namespace,
  count = 'items',
  pageSizes,
  always = false,
}: PaginationProps): ReactNode {
  const scena = useScena();
  const { t } = useI18n('query');
  const view = useStore<ListView>(`$/${namespace}/view` as BindingPath);
  const query = useStore<Query>(`$/${namespace}/query` as BindingPath);
  const total = view?.total ?? 0;
  const pageSize = query?.pageSize ?? 50;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  // Clamped, because `total` can shrink under a reader - a filter narrowing,
  // rows being deleted - and page 7 of a 2-page list renders as empty with
  // both arrows disabled, which looks like a broken list rather than a stale
  // page number.
  const page = Math.min(Math.max(1, query?.page ?? 1), pages);
  if (total <= pageSize && !always && !pageSizes?.length) return null;

  // The window this page actually covers. `first` is 0 only when there is
  // nothing at all, which is the one case where "1 – 0 of 0" would be absurd.
  const first = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, total);

  const write = (next: Partial<Query>) =>
    scena.store.set(`$/${namespace}/query` as BindingPath, { ...query, ...next });

  const setPage = (p: number) => write({ page: Math.min(pages, Math.max(1, p)) });

  const label =
    count === 'pages'
      ? t('pageOf', { page, pages, fallback: '{page} / {pages}' })
      : total === 0
        ? t('noItems', { fallback: 'nothing' })
        : t('itemRange', {
          first,
          last,
          total,
          fallback: '{first} – {last} of {total}',
        });

  return (
    <div style={bar}>
      <button style={btn} disabled={page <= 1} onClick={() => setPage(page - 1)} aria-label="Previous">
        ‹
      </button>
      <span
        style={{ fontSize: 12, color: 'var(--oo-color-muted, #8a8f98)', fontVariantNumeric: 'tabular-nums' }}
        // The count changes under a reader as pages turn, and a screen reader
        // should hear the new one rather than only find it if it goes looking.
        aria-live="polite"
      >
        {label}
      </span>
      <button style={btn} disabled={page >= pages} onClick={() => setPage(page + 1)} aria-label="Next">
        ›
      </button>
      {pageSizes && pageSizes.length > 0 ? (
        <select
          style={select}
          value={pageSize}
          aria-label={t('perPage', { fallback: 'Rows per page' })}
          onChange={(event) => write({ page: 1, pageSize: Number(event.currentTarget.value) })}
        >
          {/* A size the reader is already on but that is not in the list stays
              selectable, so a stored layout does not silently jump them. */}
          {[...new Set([...pageSizes, pageSize])]
            .sort((a, b) => a - b)
            .map((size) => (
              <option key={size} value={size}>
                {t('perPageOption', { size, fallback: '{size} / page' })}
              </option>
            ))}
        </select>
      ) : null}
    </div>
  );
}

const bar: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 10,
  padding: '6px 8px',
  borderTop: '1px solid var(--oo-color-border, #2b2f37)',
};
const btn: CSSProperties = {
  appearance: 'none',
  background: 'none',
  border: '1px solid var(--oo-color-border, #2b2f37)',
  borderRadius: 4,
  color: 'var(--oo-color-text, #e6e8eb)',
  cursor: 'pointer',
  width: 24,
  height: 24,
  lineHeight: '20px',
};
const select: CSSProperties = {
  appearance: 'none',
  background: 'var(--oo-color-canvas, #14171c)',
  border: '1px solid var(--oo-color-border, #2b2f37)',
  borderRadius: 4,
  color: 'var(--oo-color-muted, #8a8f98)',
  cursor: 'pointer',
  font: 'inherit',
  fontSize: 11,
  padding: '2px 4px',
};
