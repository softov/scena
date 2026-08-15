import type { CSSProperties, ReactNode } from 'react';
import { resolveColorVar, type ResourceColor } from '../../types/colors.js';
import './Badge.css';

// Inline status pill. `tone` selects a semantic preset; `color` overrides via
// the standard scena ResourceColor (named token, raw triplet, or var ref) so a
// caller can color it from a resource's registered color the same way the
// minimap and picker rows do.
export type BadgeTone = 'default' | 'success' | 'warning' | 'danger' | 'info';

export interface BadgeProps {
  children?: ReactNode;
  label?: string | number;
  text?: string | number; // alias for label, for consistency with Alert
  tone?: BadgeTone;
  variant?: BadgeTone;
  color?: ResourceColor;
  outline?: boolean;
  style?: CSSProperties;
  className?: string;
}

export function Badge({
  children,
  text,
  label,
  tone,
  variant,
  color,
  outline,
  style,
  className,
}: BadgeProps) {
  const inline: CSSProperties = color
    ? ({ ['--oo-color' as string]: resolveColorVar(color), ...style } as CSSProperties)
    : (style ?? {});
  return (
    <span
      className={['oo-badge', className].filter(Boolean).join(' ')}
      data-tone={tone}
      data-variant={tone ?? variant}
      data-outline={outline ? 'true' : undefined}
      style={inline}
    >
      {label ?? text ?? children}
    </span>
  );
}
