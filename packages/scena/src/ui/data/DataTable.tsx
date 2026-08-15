import type { ReactNode } from 'react';
import { Listable, type ListableColumn } from './Listable.js';

// Spec-driven table: plain `columns` + `rows` data (the a2ui / agent-surface
// shape). A thin adapter over Listable — it builds the typed ListableColumn[]
// and delegates rendering, sorting, selection and the responsive list⇄table
// behavior. Use Listable directly when you need custom cell renderers.
export interface DataColumn {
  key: string;
  label?: ReactNode;
  width?: string;
  align?: 'left' | 'right';
}

export type DataRow = Record<string, unknown>;

export interface DataTableProps {
  columns: DataColumn[];
  rows: DataRow[];
  rowKey?: string;                 // field used as stable key; default 'id'
  caption?: ReactNode;
  selectedKey?: string | null;
  onSelect?: (row: DataRow) => void;
  onActivate?: (row: DataRow) => void;
  emptyState?: ReactNode;
}

function formatCell(value: unknown): ReactNode {
  if (value == null) return '';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

export function DataTable({
  columns,
  rows,
  rowKey = 'id',
  caption,
  selectedKey,
  onSelect,
  onActivate,
  emptyState,
}: DataTableProps) {
  const cols: ListableColumn<DataRow>[] = columns.map((c) => ({
    key: c.key,
    label: c.label ?? c.key,
    width: c.width,
    align: c.align,
    sortable: true,
    render: (row) => formatCell(row[c.key]),
  }));

  return (
    <Listable
      items={rows}
      columns={cols}
      getKey={(row) => String(row[rowKey] ?? '')}
      title={caption}
      selectedKey={selectedKey}
      onSelect={onSelect}
      onActivate={onActivate}
      emptyState={emptyState}
    />
  );
}
