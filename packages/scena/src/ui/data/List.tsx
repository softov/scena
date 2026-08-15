import type { CSSProperties, ReactNode } from 'react';
import { mapAlign, weightStyle, type StyleAlign } from '../_utils.js';
import './List.css';

export type ListDirection = 'vertical' | 'horizontal';

export interface ListProps {
  children?: ReactNode;
  direction?: ListDirection;     // a2ui v0.10 (def 'vertical')
  align?: StyleAlign;            // a2ui v0.10 (def 'stretch')
  weight?: number;               // a2ui CatalogComponentCommon — flex-grow
  // scena extensions:
  gap?: number | string;         // overrides --oo-list-gap token
  padding?: number | string;     // overrides --oo-list-padding token
  maxHeight?: number | string;   // not in a2ui spec
  style?: CSSProperties;
}

// Vertical (or horizontal) scrolling container. a2ui spec children may be a
// static id array OR a dynamic `{path, componentId}` — both arrive here as a
// resolved ReactNode array because ViewMount.resolveProp expands
// DynamicChildList upstream. List itself stays a thin container.
export function List({
  children,
  direction = 'vertical',
  align = 'stretch',
  weight,
  gap,
  padding,
  maxHeight,
  style,
}: ListProps) {
  const inlineStyle: CSSProperties = {
    alignItems: mapAlign(align),
    ...(gap !== undefined ? { gap } : null),
    ...(padding !== undefined ? { padding } : null),
    ...(maxHeight !== undefined ? { maxHeight } : null),
    ...weightStyle(weight),
    ...style,
  };
  return (
    <div className="oo-list" data-direction={direction} style={inlineStyle}>
      {children}
    </div>
  );
}
