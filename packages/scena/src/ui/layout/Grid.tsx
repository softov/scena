import type { CSSProperties, ReactNode } from 'react';
import { mapAlign, weightStyle, type StyleAlign } from '../_utils.js';
import './Grid.css';

// A 2-D wrapping grid. By default tracks are sized by `minColumnWidth` and
// wrap to fit (auto-fit); pass `columns` for a fixed count. Like List, it is a
// thin container — a DynamicChildList in `children` is expanded upstream by
// ViewMount, so "GridList" is just Grid over a collection.
export interface GridProps {
  children?: ReactNode;
  minColumnWidth?: number | string;   // default 220 → repeat(auto-fit, minmax(220px, 1fr))
  columns?: number;                   // fixed column count; overrides auto-fit
  gap?: number | string;
  align?: StyleAlign;                 // align-items (default 'stretch')
  weight?: number;                    // a2ui CatalogComponentCommon flex-grow
  style?: CSSProperties;
}

function asSize(v: number | string): string {
  return typeof v === 'number' ? `${v}px` : v;
}

export function Grid({ children, minColumnWidth = 220, columns, gap, align = 'stretch', weight, style }: GridProps) {
  const gridTemplateColumns = columns
    ? `repeat(${columns}, minmax(0, 1fr))`
    : `repeat(auto-fit, minmax(${asSize(minColumnWidth)}, 1fr))`;

  const gridStyle: CSSProperties = {
    gridTemplateColumns,
    gap: gap ?? 'var(--oo-grid-gap, 12px)',
    alignItems: mapAlign(align, 'stretch'),
    ...weightStyle(weight),
    ...style,
  };

  return (
    <div className="oo-grid" style={gridStyle}>
      {children}
    </div>
  );
}
