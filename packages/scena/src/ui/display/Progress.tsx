import type { CSSProperties } from 'react';
import { resolveColorVar, type ResourceColor } from '../../sdk/colors.js';
import './Progress.css';

export interface ProgressProps {
  value?: number;
  max?: number;
  label?: string;
  // When unset, shows just the bar. Set to 'value', 'percent', or a custom
  // string to display alongside the bar.
  display?: 'value' | 'percent' | string;
  // Bar color via the standard scena ResourceColor system. Default = accent.
  color?: ResourceColor;
  // For indeterminate state — animated stripe.
  indeterminate?: boolean;
  height?: number;
  style?: CSSProperties;
  className?: string;
}

export function Progress({
  value = 0,
  max = 100,
  label,
  display,
  color,
  indeterminate,
  height,
  style,
  className,
}: ProgressProps) {
  const safeMax = max > 0 ? max : 100;
  const pct = Math.max(0, Math.min(100, (value / safeMax) * 100));
  const colorVar = color ? resolveColorVar(color) : 'var(--oo-color-accent-rgb, 0 102 204)';
  const wrapperStyle: CSSProperties = {
    ['--oo-progress-color' as string]: colorVar,
    ['--oo-progress-height' as string]: height ? `${height}px` : undefined,
    ...style,
  } as CSSProperties;
  const valueText =
    display === 'value' ? `${value} / ${safeMax}`
    : display === 'percent' ? `${Math.round(pct)}%`
    : display;
  return (
    <div className={['oo-progress', className].filter(Boolean).join(' ')} style={wrapperStyle}>
      {label || valueText ? (
        <div className="oo-progress__head">
          {label ? <span className="oo-progress__label">{label}</span> : null}
          {valueText ? <span className="oo-progress__value">{valueText}</span> : null}
        </div>
      ) : null}
      <div
        className="oo-progress__track"
        role="progressbar"
        aria-valuenow={indeterminate ? undefined : value}
        aria-valuemin={0}
        aria-valuemax={safeMax}
        aria-valuetext={label}
      >
        {indeterminate ? (
          <div className="oo-progress__bar oo-progress__bar--indet" />
        ) : (
          <div className="oo-progress__bar" style={{ width: `${pct}%` }} />
        )}
      </div>
    </div>
  );
}
