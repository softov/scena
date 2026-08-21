import {
  ShellSplitter,
  SurfaceArea,
  useLayout,
  useSurfacePresentation,
} from '@softov/scena/react';
import { isOverlaid } from '@softov/scena';
import { SHELL_PRESENTATION_POLICY } from './shell-presentation.js';
import '@softov/scena/styles/surface.css';

// Lazy-loaded shell. Mirrors web-next's CustomShell. The titlebar is a
// single `titlebar` surface rendered by BarLayout, which buckets each mount
// by its `slot` prop (left | center | right) — entries are populated in
// register-shell.
//
// Right-click menus are owned by the explorer / consumer that triggers them
// (each renders its own `<ContextMenu>` inline). The legacy
// `scena:menu:popup` event-driven popup has been removed along with
// `scena.menus`.
//
// Responsive behavior is per-surface OCCUPATION, not visibility. Every
// `visible` flag below stays exactly what the user set through the layout
// modes / zone toggles; `useSurfacePresentation` only decides whether an open
// surface takes width or floats over `main`. Narrowing the window never writes
// layout state, so widening restores what you had.

export default function CustomShell() {
  const layout = useLayout();
  const surfaces = layout.surfaces;
  const sidebarLeftWidth = surfaces['sidebar:left']?.size ?? 240;
  const sidebarRightWidth = surfaces['sidebar:right']?.size ?? 280;
  const sidebarLeftVisible = surfaces['sidebar:left']?.visible ?? true;
  const sidebarRightVisible = surfaces['sidebar:right']?.visible ?? false;
  const titlebarVisible = surfaces['titlebar']?.visible ?? true;
  const activityVisible = surfaces.activitybar?.visible ?? true;
  const statusVisible = surfaces.statusbar?.visible ?? true;

  // Policy is this app's (see shell-presentation.ts); scena supplies only the
  // mechanism, and defaults every surface to `docked` when none is passed.
  const leftPresentation = useSurfacePresentation('sidebar:left', SHELL_PRESENTATION_POLICY);
  const rightPresentation = useSurfacePresentation('sidebar:right', SHELL_PRESENTATION_POLICY);
  const activityPresentation = useSurfacePresentation('activitybar', SHELL_PRESENTATION_POLICY);

  // A floating surface has nothing left to resize against, so its splitter and
  // its explicit width both go — the presentation owns its geometry.
  const leftFloats = isOverlaid(leftPresentation);
  const rightFloats = isOverlaid(rightPresentation);

  const scrimVisible =
    (leftFloats && sidebarLeftVisible) || (rightFloats && sidebarRightVisible);

  return (
    <div
      className="oo-shell"
      style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', overflow: 'hidden' }}
    >
      {titlebarVisible ? <SurfaceArea surface="titlebar" role="bar" edge="block-end" /> : null}
      {/* `position: relative` so overlaid surfaces position against the shell
          body rather than the viewport. */}
      <div style={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden', position: 'relative' }}>
        {activityVisible ? (
          <SurfaceArea
            surface="activitybar"
            role="rail"
            edge="inline-end"
            presentation={activityPresentation}
          />
        ) : null}
        {sidebarLeftVisible ? (
          <>
            <SurfaceArea
              surface="sidebar:left"
              role="panel"
              edge="inline-end"
              presentation={leftPresentation}
              style={leftFloats ? undefined : { width: sidebarLeftWidth, flex: '0 0 auto', overflow: 'hidden' }}
            />
            {leftFloats ? null : (
              <ShellSplitter surface="sidebar:left" orientation="vertical" min={160} max={720} />
            )}
          </>
        ) : null}
        <SurfaceArea surface="main" role="main" style={{ flex: 1, minWidth: 0, minHeight: 0, overflow: 'hidden' }} />
        {sidebarRightVisible ? (
          <>
            {rightFloats ? null : (
              <ShellSplitter surface="sidebar:right" orientation="vertical" invert min={200} max={720} />
            )}
            <SurfaceArea
              surface="sidebar:right"
              role="panel"
              edge="inline-start"
              presentation={rightPresentation}
              style={rightFloats ? undefined : { width: sidebarRightWidth, flex: '0 0 auto', overflow: 'hidden' }}
            />
          </>
        ) : null}
        {scrimVisible ? <div className="oo-surface-scrim" /> : null}
      </div>
      {statusVisible ? <SurfaceArea surface="statusbar" role="bar" edge="block-start" /> : null}
    </div>
  );
}
