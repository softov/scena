import type { CSSProperties } from 'react';
import './Image.css';

// a2ui v0.10: required `url`, optional `description` (a11y), `fit` (camelCase
// enum), `variant`. Legacy `src`/`alt` accepted as transitional aliases;
// callers should migrate to `url`/`description`.
export type ImageFit = 'contain' | 'cover' | 'fill' | 'none' | 'scaleDown';
export type ImageVariant =
  | 'icon'
  | 'avatar'
  | 'smallFeature'
  | 'mediumFeature'
  | 'largeFeature'
  | 'header';

export interface ImageProps {
  url?: string;
  description?: string;
  fit?: ImageFit;
  variant?: ImageVariant;
  // scena extensions:
  width?: number | string;
  height?: number | string;
  style?: CSSProperties;
  // Legacy aliases (deprecated — accepted for transition):
  src?: string;
  alt?: string;
}

function mapFit(f?: string): CSSProperties['objectFit'] {
  switch (f) {
    case 'cover':     return 'cover';
    case 'contain':   return 'contain';
    case 'none':      return 'none';
    case 'scaleDown': return 'scale-down';
    case 'fill':
    default:          return 'fill';
  }
}

export function Image({
  url,
  description,
  fit = 'fill',
  variant,
  width,
  height,
  style,
  src,
  alt,
}: ImageProps) {
  const effectiveUrl = url ?? src;
  if (!effectiveUrl) return null;
  const effectiveAlt = description ?? alt ?? '';
  return (
    <img
      className="oo-image"
      data-variant={variant}
      src={effectiveUrl}
      alt={effectiveAlt}
      style={{ width, height, objectFit: mapFit(fit), ...style }}
    />
  );
}
