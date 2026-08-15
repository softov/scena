import type { CSSProperties, ReactNode } from 'react';
import { weightStyle } from '../_utils.js';
import './Card.css';

// a2ui v0.10: Card has a single `child` (ComponentId). scena adds optional
// `title`/`subtitle` as ergonomic UX shortcuts (the spec model would use a
// Column with Text + Card wrapping). `weight` from CatalogComponentCommon.
export interface CardProps {
  child?: ReactNode;
  weight?: number;
  // scena extensions:
  title?: string;
  subtitle?: string;
  children?: ReactNode;
  style?: CSSProperties;
}

export function Card({ title, subtitle, child, children, weight, style }: CardProps) {
  const body = child ?? children;
  const inlineStyle: CSSProperties = { ...weightStyle(weight), ...style };
  return (
    <div className="oo-card" style={inlineStyle}>
      {title ? <div className="oo-card__title">{title}</div> : null}
      {subtitle ? <div className="oo-card__subtitle">{subtitle}</div> : null}
      {body}
    </div>
  );
}
