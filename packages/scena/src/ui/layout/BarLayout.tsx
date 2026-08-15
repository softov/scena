import type { ReactNode } from 'react';
import type { LayoutProps } from '../../types/layout.js';
import type { ResolvedMount } from '../../types/mount-surface.js';

// Horizontal bar with three slots (left | center | right). Each mount picks
// its slot via a literal-string `slot` prop on its component node:
//
//   { component: 'AppTitle',  slot: 'left' }
//   { component: 'StatusItem', slot: 'right' }
//
// Mounts without `slot` (or with an unrecognized value) fall into `center`.
// Default layout for `titlebar` and `statusbar` — same surface API as any
// other surface, so settings only needs one "Visible" toggle to hide the
// whole bar.

type Slot = 'left' | 'center' | 'right';

function isSlot(v: unknown): v is Slot {
  return v === 'left' || v === 'center' || v === 'right';
}

function slotOf(m: ResolvedMount): Slot {
  const s = m.component.slot;
  return isSlot(s) ? s : 'center';
}

export function BarLayout({ mounts, renderMount }: LayoutProps) {
  const left: ResolvedMount[] = [];
  const center: ResolvedMount[] = [];
  const right: ResolvedMount[] = [];
  for (const m of mounts) {
    const bucket = slotOf(m) === 'left' ? left : slotOf(m) === 'right' ? right : center;
    bucket.push(m);
  }

  return (
    <div className="oo-layout oo-layout--bar">
      <div className="oo-bar__slot oo-bar__slot--left">
        {left.map((m) => (
          <div key={m.key} className="oo-bar__item">{renderMount(m) as ReactNode}</div>
        ))}
      </div>
      <div className="oo-bar__slot oo-bar__slot--center">
        {center.map((m) => (
          <div key={m.key} className="oo-bar__item">{renderMount(m) as ReactNode}</div>
        ))}
      </div>
      <div className="oo-bar__slot oo-bar__slot--right">
        {right.map((m) => (
          <div key={m.key} className="oo-bar__item">{renderMount(m) as ReactNode}</div>
        ))}
      </div>
    </div>
  );
}
