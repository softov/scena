import { ShellSplitter, SurfaceArea, useLayout } from '@softov/scena/react';

// Lazy-loaded shell. Mirrors web-next's CustomShell. The titlebar is a
// single `titlebar` surface rendered by BarLayout, which buckets each mount
// by its `slot` prop (left | center | right) — entries are populated in
// register-shell.

// Right-click menus are owned by the explorer / consumer that triggers them
// (each renders its own `<ContextMenu>` inline). The legacy
// `scena:menu:popup` event-driven popup has been removed along with
// `scena.menus`.

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

  return (
    <div
      className="oo-shell"
      style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', overflow: 'hidden' }}
    >
      {titlebarVisible ? <SurfaceArea surface="titlebar" /> : null}
      <div style={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden' }}>
        {activityVisible ? <SurfaceArea surface="activitybar" /> : null}
        {sidebarLeftVisible ? (
          <>
            <SurfaceArea
              surface="sidebar:left"
              style={{ width: sidebarLeftWidth, flex: '0 0 auto', overflow: 'hidden' }}
            />
            <ShellSplitter surface="sidebar:left" orientation="vertical" min={160} max={720} />
          </>
        ) : null}
        <SurfaceArea surface="main" style={{ flex: 1, minWidth: 0, minHeight: 0, overflow: 'hidden' }} />
        {sidebarRightVisible ? (
          <>
            <ShellSplitter surface="sidebar:right" orientation="vertical" invert min={200} max={720} />
            <SurfaceArea
              surface="sidebar:right"
              style={{ width: sidebarRightWidth, flex: '0 0 auto', overflow: 'hidden' }}
            />
          </>
        ) : null}
      </div>
      {statusVisible ? <SurfaceArea surface="statusbar" /> : null}
    </div>
  );
}
