import type { CSSProperties } from 'react';
import { resolveColorVar, type ResourceColor } from '../../sdk/colors.js';
import './Spinner.css';

export interface SpinnerProps {
  label?: string;
  size?: number;
  color?: ResourceColor;
  inline?: boolean;
  style?: CSSProperties;
  className?: string;
}

export function Spinner({
  label,
  size = 16,
  color,
  inline = true,
  style,
  className,
}: SpinnerProps) {
  const wrapperStyle: CSSProperties = {
    ['--oo-spinner-size' as string]: `${size}px`,
    ['--oo-spinner-color' as string]: color ? resolveColorVar(color) : 'var(--oo-color-accent)',
    ...(inline ? { display: 'inline-flex' } : { display: 'flex' }),
    ...style,
  };
  return (
    <span
      role="status"
      aria-live="polite"
      aria-label={label ?? 'Loading'}
      className={['oo-r-wrap', className].filter(Boolean).join(' ')}
      style={wrapperStyle}
    >
      <span className="oo-spinner" aria-hidden />
      {label ? <span className="oo-spinner__label">{label}</span> : null}
    </span>
  );
}

