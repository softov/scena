import type { CSSProperties } from 'react';
import { resolveColorAlpha, type ResourceColor } from '../../sdk/colors.js';

// Renders inline SVG from either a raw `markup` string (full <svg>...</svg>)
// or a single `path` d-attribute. The latter is convenient for icon glyphs;
// the former covers anything more complex (logos, diagrams).
//
// For glyph use, prefer `<Icon name={{path: '...'}} />` from basic/ — that
// component already integrates with the color/size conventions.
export interface SvgProps {
  // Full SVG markup. Will be set via dangerouslySetInnerHTML — caller MUST
  // ensure the source is trusted (XSS risk if rendering arbitrary input).
  markup?: string;
  // Single SVG path d-attribute. Renders inside a 24x24 viewBox using
  // currentColor for fill.
  path?: string;
  width?: number | string;
  height?: number | string;
  // Resolves through the standard scena ResourceColor system.
  color?: ResourceColor;
  // Override the viewBox when `path` is set.
  viewBox?: string;
  style?: CSSProperties;
  className?: string;
}

export function Svg({
  markup,
  path,
  width = 24,
  height = 24,
  color,
  viewBox = '0 0 24 24',
  style,
  className,
}: SvgProps) {
  const inlineStyle: CSSProperties = {
    color: color ? resolveColorAlpha(color) : 'currentColor',
    ...style,
  };
  if (markup) {
    return (
      <span
        className={['oo-svg', className].filter(Boolean).join(' ')}
        style={{ display: 'inline-flex', width, height, ...inlineStyle }}
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: markup }}
      />
    );
  }
  if (path) {
    return (
      <svg
        className={['oo-svg', className].filter(Boolean).join(' ')}
        viewBox={viewBox}
        width={width}
        height={height}
        fill="currentColor"
        xmlns="http://www.w3.org/2000/svg"
        style={inlineStyle}
      >
        <path d={path} />
      </svg>
    );
  }
  return null;
}
