import type { CSSProperties, ReactNode } from 'react';
import './Toolbar.css';

export interface ToolbarProps {
  // Optional extra class appended to `oo-toolbar` for app-specific overrides.
  className?: string;
  style?: CSSProperties;
  // Layout direction. Defaults to `row` (horizontal); `column` stacks items
  // vertically for narrow side rails or accordion-style toolbars.
  direction?: 'row' | 'column';
  // Inline-style alignment shortcuts. Default cross-axis alignment is `center`;
  // the main axis defaults to `start`.
  align?: CSSProperties['alignItems'];
  justify?: CSSProperties['justifyContent'];
  // Token-friendly gap between children. Accepts CSS gap values; the default
  // pulls from `--oo-spacing-sm` so toolbars match the rest of the chrome.
  gap?: CSSProperties['gap'];
  children: ReactNode;
}

// Thin styled container for any horizontal control strip (layout toolbars,
// titlebar slots, panel headers, ...). Owns padding, gap, border and bg via
// the `oo-toolbar` class so callers only place children inside.
//
// Intentionally non-opinionated about what goes in: caller decides whether
// items are buttons, selects, inline labels, or full React widgets. Use
// `direction='column'` for vertical control rails.
export function Toolbar({
  className,
  style,
  direction = 'row',
  align,
  justify,
  gap,
  children,
}: ToolbarProps) {
  // Inline overrides only when a caller passed an explicit prop — otherwise
  // we let Toolbar.css drive every value via tokens.
  const inline: CSSProperties = { ...style };
  if (align !== undefined) inline.alignItems = align;
  if (justify !== undefined) inline.justifyContent = justify;
  if (gap !== undefined) inline.gap = gap;

  return (
    <div
      className={['oo-toolbar', className].filter(Boolean).join(' ')}
      data-direction={direction}
      style={inline}
    >
      {children}
    </div>
  );
}
