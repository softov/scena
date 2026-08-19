import type { CSSProperties, ReactNode } from 'react';
import './DetailList.css';

// Key → value detail block (the "DetailGrid" pattern). Used on resource detail
// pages. `span` items take the full row width — good for long text (a resume,
// an address) that shouldn't sit in a narrow column.
export interface DetailItem {
  label: ReactNode;
  value: ReactNode;
  span?: boolean;
}

export interface DetailListProps {
  items: DetailItem[];
  columns?: number;        // default 2
  style?: CSSProperties;
}

export function DetailList({ items, columns, style }: DetailListProps) {

  const styleColumns = columns ? `repeat(${columns}, minmax(0, 1fr))` : `repeat(auto-fill, minmax(160px, 1fr))`;
  return (
    <dl

      className="oo-detail-list"
      style={{ gridTemplateColumns: styleColumns, ...style }}
    >
      {items.map((item, i) => (
        <div
          key={i}
          className={`oo-detail-list__item${item.span ? ' oo-detail-list__item--span' : ''}`}
        >
          <dt className="oo-detail-list__label">{item.label}</dt>
          <dd className="oo-detail-list__value">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}
