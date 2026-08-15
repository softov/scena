import type { CSSProperties } from 'react';
import { appearance } from '../../styles/index.js';
import './Text.css';

export type TextTone = 'accent' | 'success' | 'warning' | 'danger';

// a2ui v0.10: variant ∈ h1/h2/h3/h4/h5/caption/body (def body). scena keeps
// muted/weight/align/tone as scena-only extensions.
export interface TextProps {
  text?: string | number | boolean;
  variant?: 'body' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'caption';
  // scena extensions:
  muted?: boolean;
  weight?: 'normal' | 'bold';
  align?: 'start' | 'center' | 'end';
  tone?: TextTone;
  style?: CSSProperties;
}

export function Text({
  text,
  variant = 'body',
  muted,
  weight,
  align,
  tone,
  style,
}: TextProps) {
  const cls = [
    appearance('oo-text', { variant }),
    muted ? 'oo-text--muted' : '',
    weight === 'bold' ? 'oo-text--bold' : '',
    align ? `oo-text--align-${align}` : '',
    tone ? `oo-text--tone-${tone}` : '',
  ]
    .filter(Boolean)
    .join(' ');
  return (
    <span className={cls} style={style}>
      {text}
    </span>
  );
}
