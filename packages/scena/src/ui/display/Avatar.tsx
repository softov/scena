import type { CSSProperties } from 'react';
import { Icon, type IconName } from './Icon.js';
import './Avatar.css';

// A round, colored thumbnail for a person, contact, or any resource that
// wants a recognisable badge. Three rendering modes, picked by which prop
// is supplied (priority: imgSrc → icon → name):
//
//   <Avatar imgSrc="…" />         → image clipped to the circle
//   <Avatar icon="person" />      → scena Icon centred in the circle
//   <Avatar name="Ada Lovelace"/> → two-letter initials ("AL")
//
// The background is either explicit (`color`) or hashed from `name` so
// the same contact gets a stable colour across renders.

export type AvatarSize = 'sm' | 'md' | 'lg' | 'xl';

export interface AvatarProps {
  name?: string;
  icon?: IconName | string | { path: string };
  imgSrc?: string;
  size?: AvatarSize | number;
  // Explicit bg. Omitted → hash-from-name. Ignored for `imgSrc`.
  color?: string;
  className?: string;
  style?: CSSProperties;
}

// Palette tuned for both light and dark themes — enough chroma to be
// distinct, enough lightness to read white text on top.
const PALETTE = [
  '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b',
  '#10b981', '#06b6d4', '#f97316', '#84cc16',
];

const SIZE_PX: Record<AvatarSize, number> = {
  sm: 24,
  md: 32,
  lg: 40,
  xl: 56,
};

function hashColor(name: string): string {
  if (!name) return PALETTE[0]!;
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return PALETTE[Math.abs(hash) % PALETTE.length]!;
}

function getInitials(name: string): string {
  if (!name) return '??';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return (parts[0]?.slice(0, 2) ?? '??').toUpperCase();
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase();
}

export function Avatar({
  name,
  icon,
  imgSrc,
  size = 'md',
  color,
  className,
  style,
}: AvatarProps) {
  const px = typeof size === 'number' ? size : SIZE_PX[size];
  const bg = color ?? (name ? hashColor(name) : PALETTE[0]!);
  const baseStyle: CSSProperties = {
    width: px,
    height: px,
    background: imgSrc ? undefined : bg,
    ...style,
  };
  const classes = ['oo-avatar', className].filter(Boolean).join(' ');

  if (imgSrc) {
    return (
      <span className={classes} style={baseStyle} aria-label={name}>
        <img src={imgSrc} alt={name ?? ''} className="oo-avatar__img" />
      </span>
    );
  }

  if (icon !== undefined) {
    // Icon component sizes itself; pick ~60% of the circle so it sits
    // comfortably inside without crowding the edges.
    return (
      <span className={classes} style={baseStyle} aria-label={name}>
        <Icon name={icon} size={Math.round(px * 0.6)} color="#fff" />
      </span>
    );
  }

  return (
    <span
      className={classes}
      style={{ ...baseStyle, fontSize: Math.round(px * 0.4) }}
      aria-label={name}
    >
      {getInitials(name ?? '')}
    </span>
  );
}
