import type { CSSProperties } from 'react';
import { appearance } from '../../styles/index.js';
import { weightStyle } from '../_utils.js';
import './Divider.css';

// a2ui v0.10: optional `axis` ('horizontal' | 'vertical', def 'horizontal').
// scena accepts legacy `orientation` as a transitional alias.
export interface DividerProps {
  axis?: 'horizontal' | 'vertical';
  weight?: number;
  // scena extensions:
  thickness?: number;
  // Legacy alias (deprecated):
  orientation?: 'horizontal' | 'vertical';
}

export function Divider({ axis, orientation, weight, thickness }: DividerProps) {
  const effectiveAxis = axis ?? orientation ?? 'horizontal';
  const sizeStyle: CSSProperties | undefined =
    thickness !== undefined
      ? effectiveAxis === 'horizontal'
        ? { height: thickness }
        : { width: thickness }
      : undefined;
  const flexStyle = weightStyle(weight);
  const hasFlex = Object.keys(flexStyle).length > 0;
  const style: CSSProperties | undefined =
    sizeStyle || hasFlex ? { ...sizeStyle, ...flexStyle } : undefined;
  return (
    <div
      role="separator"
      className={appearance('oo-divider', { variant: effectiveAxis })}
      style={style}
    />
  );
}
