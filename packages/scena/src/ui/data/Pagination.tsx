import type { CSSProperties, ReactNode } from 'react';
import { useScena } from '../../react/ScenaProvider.js';
import { useStore } from '../../react/hooks/useStore.js';
import { useI18n } from '../../react/hooks/useI18n.js';
import type { BindingPath } from '../../types/component-graph.js';
import type { ListView, Query } from '../../types/query.js';

export interface PaginationProps {
  // Resource namespace; reads `$/<namespace>/view` + `$/<namespace>/query`.
  namespace: string;
}

// Generic pager bound to a resource's query/view. Writes `$/<ns>/query.page`;
// the data provider re-resolves the view (server window or client slice).
// Hidden when everything fits on one page.
export function Pagination({ namespace }: PaginationProps): ReactNode {
  const scena = useScena();
  const { t } = useI18n('query');
  const view = useStore<ListView>(`$/${namespace}/view` as BindingPath);
  const query = useStore<Query>(`$/${namespace}/query` as BindingPath);
  const total = view?.total ?? 0;
  const page = query?.page ?? 1;
  const pageSize = query?.pageSize ?? 50;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (total <= pageSize) return null;

  const setPage = (p: number) =>
    scena.store.set(`$/${namespace}/query` as BindingPath, {
      ...query,
      page: Math.min(pages, Math.max(1, p)),
    });

  return (
    <div style={bar}>
      <button style={btn} disabled={page <= 1} onClick={() => setPage(page - 1)} aria-label="Previous">
        ‹
      </button>
      <span style={{ fontSize: 12, color: 'var(--oo-color-muted, #8a8f98)' }}>
        {t('pageOf', { page, pages, fallback: '{page} / {pages}' })}
      </span>
      <button style={btn} disabled={page >= pages} onClick={() => setPage(page + 1)} aria-label="Next">
        ›
      </button>
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
