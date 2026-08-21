import type { CSSProperties, ReactNode } from 'react';
import { useScena } from '../../react/ScenaProvider.js';
import { useStore } from '../../react/hooks/useStore.js';
import { useI18n } from '../../react/hooks/useI18n.js';
import type { BindingPath } from '../../sdk/component-graph.js';
import type { Query, WhereClause, WhereOp } from '../../sdk/query.js';

// A preset filter chip — toggles a fixed where clause on/off.
export interface FilterField {
  field: string;
  label?: string;
  op?: WhereOp; // default 'eq'
  value?: unknown; // default true (boolean flag)
}

export interface FilterProps {
  // Resource namespace; reads/writes `$/<namespace>/query`.
  namespace: string;
  // Optional preset filter chips. Advanced/user-editable where[] is a follow-up.
  fields?: FilterField[];
}

// Generic search + filter bar bound to a resource's query. Writes `q` and
// `where[]` into `$/<ns>/query` (resetting page); the provider re-resolves the
// view (server params or client-applied).
export function Filter({ namespace, fields }: FilterProps): ReactNode {
  const scena = useScena();
  const { t } = useI18n('query');
  const query = useStore<Query>(`$/${namespace}/query` as BindingPath);
  const where = query?.where ?? [];

  const setQuery = (patch: Partial<Query>) =>
    scena.store.set(`$/${namespace}/query` as BindingPath, {
      ...(query ?? { page: 1, pageSize: 50 }),
      ...patch,
      page: 1,
    });

  const valueOf = (f: FilterField) => f.value ?? true;
  const isOn = (f: FilterField) => where.some((w) => w.field === f.field && w.value === valueOf(f));
  const toggle = (f: FilterField) => {
    const rest = where.filter((w) => w.field !== f.field);
    const next: WhereClause[] = isOn(f)
      ? rest
      : [...rest, { field: f.field, op: f.op ?? 'eq', value: valueOf(f) }];
    setQuery({ where: next });
  };

  return (
    <div style={wrap}>
      <input
        style={input}
        placeholder={t('search', 'Search…')}
        value={query?.q ?? ''}
        onChange={(e) => setQuery({ q: e.currentTarget.value })}
      />
      {fields?.length ? (
        <div style={chips}>
          {fields.map((f) => (
            <button
              key={f.field}
              type="button"
              style={{ ...chip, ...(isOn(f) ? chipOn : {}) }}
              onClick={() => toggle(f)}
            >
              {f.label ?? f.field}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

const wrap: CSSProperties = { display: 'flex', flexDirection: 'column', gap: 6, padding: 8 };
const input: CSSProperties = {
  boxSizing: 'border-box',
  width: '100%',
  padding: '6px 8px',
  background: 'var(--oo-color-canvas, #16181d)',
  border: '1px solid var(--oo-color-border, #2b2f37)',
  borderRadius: 4,
  outline: 'none',
  fontSize: 13,
  color: 'var(--oo-color-text, #e6e8eb)',
};
const chips: CSSProperties = { display: 'flex', flexWrap: 'wrap', gap: 4 };
const chip: CSSProperties = {
  appearance: 'none',
  border: '1px solid var(--oo-color-border, #2b2f37)',
  background: 'none',
  borderRadius: 999,
  padding: '2px 8px',
  fontSize: 11,
  cursor: 'pointer',
  color: 'var(--oo-color-muted, #8a8f98)',
};
const chipOn: CSSProperties = {
  color: '#fff',
  background: 'var(--oo-color-accent, #4c7fff)',
  borderColor: 'var(--oo-color-accent, #4c7fff)',
};
