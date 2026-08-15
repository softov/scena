import type { CSSProperties, ReactNode } from 'react';
import { mapAlign, mapJustify, weightStyle, type StyleAlign, type StyleJustify } from '../_utils.js';
import './Column.css';

export interface ColumnProps {
  children?: ReactNode;
  justify?: StyleJustify;       // a2ui v0.10
  align?: StyleAlign;           // a2ui v0.10
  weight?: number;              // a2ui CatalogComponentCommon — flex-grow
  // scena extensions:
  gap?: number | string;        // overrides --oo-column-gap token
  style?: CSSProperties;
}

export function Column({
  children,
  justify = 'start',
  align = 'stretch',
  weight,
  gap,
  style,
}: ColumnProps) {
  const inlineStyle: CSSProperties = {
    justifyContent: mapJustify(justify),
    alignItems: mapAlign(align),
    ...(gap !== undefined ? { gap } : null),
    ...weightStyle(weight),
    ...style,
  };
  return <div className="oo-col" style={inlineStyle}>{children}</div>;
}
