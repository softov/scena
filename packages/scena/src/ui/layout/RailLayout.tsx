import type { ReactNode } from 'react';
import type { LayoutProps } from '../../types/layout.js';
import type { ResolvedMount } from '../../types/mount-surface.js';

// Vertical icon rail with two groups (top + bottom). The bottom group sticks
// to the bottom via margin-top: auto; mount order within each group is preserved.
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

export function RailLayout({ mounts, renderMount }: LayoutProps) {
  const top: ResolvedMount[] = [];
  const bottom: ResolvedMount[] = [];
  for (const m of mounts) {
    (posOf(m) === 'bottom' ? bottom : top).push(m);
  }

  return (
    <div
      className="oo-layout oo-layout--rail"
      style={{ display: 'flex', flexDirection: 'column', height: '100%' }}
    >
      <div
        className="oo-rail__top"
        style={{ display: 'flex', flexDirection: 'column' }}
      >
        {top.map((m) => (
          <div key={m.key} style={{ display: 'contents' }}>
            {renderMount(m) as ReactNode}
          </div>
        ))}
      </div>
      <div
        className="oo-rail__bottom"
        style={{ display: 'flex', flexDirection: 'column', marginTop: 'auto' }}
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
