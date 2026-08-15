import type { CSSProperties, ReactNode } from 'react';
import { mapAlign, mapJustify, weightStyle, type StyleAlign, type StyleJustify } from '../_utils.js';
import './Row.css';

export interface RowProps {
  children?: ReactNode;
  justify?: StyleJustify;       // a2ui v0.10
  align?: StyleAlign;           // a2ui v0.10
  weight?: number;              // a2ui CatalogComponentCommon — flex-grow
  // scena extensions:
  gap?: number | string;        // overrides --oo-row-gap token
  wrap?: boolean;               // not in a2ui spec
  style?: CSSProperties;
}

export function Row({
  children,
  justify = 'start',
  align = 'stretch',
  weight,
  gap,
  wrap = false,
  style,
}: RowProps) {
  return (
    <div
      className="oo-row"
      data-align={mapAlign(align)}
      data-weight={weight}
      data-justify={mapJustify(justify)}
      style={{
        // display: 'flex',
        // flexDirection: 'row',
        ...weightStyle(weight),
      }}>
      <section style={{
        // display: 'flex',
        // flexDirection: 'row',
        flexWrap: wrap ? 'wrap' : 'nowrap',
        justifyContent: mapJustify(justify, style?.justifyContent),
        alignItems: mapAlign(align, style?.alignItems),
        // width: '100%',
        // minHeight: '100%',
        // ...(gap !== undefined ? { gap } : null),
        ['--oo-row-gap' as string]: gap !== undefined ? (typeof gap === 'number' ? `${gap}px` : gap) : undefined,
        ...style,
      }}>{children}</section>
    </div>
  );
}
