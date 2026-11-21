// A surface drawn in a browser window of its own.
//
// A window is a surface like `main`: mounts, a layout and a tab tree, under a
// name. Its name is `window:<id>`, and its state carries `window`, the place
// and size of the browser window. The layout state is the only record of
// which windows exist, so it is kept and restored with no storage of its own.
// SurfaceWindows opens a browser window for each such surface.

import type { ScenaLayout } from './layout.js';
import type { SurfaceName } from './mount-surface.js';

// In screen pixels. `left` and `top` are the window's `screenX` and `screenY`;
// `width` and `height` are its `innerWidth` and `innerHeight`, the size that
// `window.open` takes, so a window reopens at the size it had.
export interface WindowBounds {
  left: number;
  top: number;
  width: number;
  height: number;
}

const PREFIX = 'window:';

export function windowSurface(id: string | number): SurfaceName {
  return `${PREFIX}${id}`;
}

export function isWindowSurface(name: SurfaceName): boolean {
  return name.startsWith(PREFIX) && name.length > PREFIX.length;
}

// The first `window:<n>`, from 1, that the layout does not hold.
export function newWindowSurface(layout: ScenaLayout): SurfaceName {
  for (let n = 1; ; n++) {
    const name = windowSurface(n);
    if (layout.surfaces[name] === undefined) return name;
  }
}

// The layout without `name`. `setSurface` can only add or change a surface;
// a closed window leaves the state through `layout.set` with this.
export function removeSurface(layout: ScenaLayout, name: SurfaceName): ScenaLayout {
  if (layout.surfaces[name] === undefined) return layout;
  const surfaces = { ...layout.surfaces };
  delete surfaces[name];
  return { ...layout, surfaces };
}
