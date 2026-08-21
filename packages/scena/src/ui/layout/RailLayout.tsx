import type { ReactNode } from 'react';
import type { LayoutProps } from '../../sdk/layout.js';
import type { ResolvedMount } from '../../sdk/mount-surface.js';

// Icon rail with two groups (top + bottom). The second group sticks to the far
// end via an auto margin; mount order within each group is preserved.
//
// Axis follows the hosting surface's presentation: a docked activitybar is a
// vertical rail, and the same surface presented as a `bar` (pinned to the
// bottom edge when the viewport is narrow) lays out horizontally. Both the
// flex direction AND which margin does the pushing have to flip together —
// margin-top: auto does nothing in a row.
//
// Mounts declare placement via a literal-string `pos` prop on the root node
// (`pos: 'bottom'`). Anything else (including undefined) counts as top.

function isLiteralString(v: unknown): v is string {
  return typeof v === 'string';
}

function posOf(mount: ResolvedMount): 'top' | 'bottom' {
  const pos = mount.component.pos;
  if (isLiteralString(pos) && pos === 'bottom') return 'bottom';
  return 'top';
}

export function RailLayout({ mounts, renderMount, presentation }: LayoutProps) {
  const top: ResolvedMount[] = [];
  const bottom: ResolvedMount[] = [];
  for (const m of mounts) {
    (posOf(m) === 'bottom' ? bottom : top).push(m);
  }

  const horizontal = presentation === 'bar';
  const direction = horizontal ? 'row' : 'column';
  const pushEnd = horizontal ? { marginLeft: 'auto' } : { marginTop: 'auto' };

  return (
    <div
      className="oo-layout oo-layout--rail"
      data-orientation={horizontal ? 'horizontal' : 'vertical'}
      style={{
        display: 'flex',
        flexDirection: direction,
        height: horizontal ? undefined : '100%',
        width: horizontal ? '100%' : undefined,
        alignItems: horizontal ? 'center' : undefined,
      }}
    >
      <div
        className="oo-rail__top"
        style={{ display: 'flex', flexDirection: direction }}
      >
        {top.map((m) => (
          <div key={m.key} style={{ display: 'contents' }}>
            {renderMount(m) as ReactNode}
          </div>
        ))}
      </div>
      <div
        className="oo-rail__bottom"
        style={{ display: 'flex', flexDirection: direction, ...pushEnd }}
      >
        {bottom.map((m) => (
          <div key={m.key} style={{ display: 'contents' }}>
            {renderMount(m) as ReactNode}
          </div>
        ))}
      </div>
    </div>
  );
}
