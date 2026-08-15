import { useLayout } from './hooks/useLayout.js';
import { SurfaceArea } from './SurfaceArea.js';
import { ShellSplitter } from './ShellSplitter.js';

// Minimal flex shell. Each surface is rendered via SurfaceArea, which
// delegates to the registered layout for that surface (tab / split / stack /
// rail / inline / floating). Apps that want a different chrome layout can
// compose SurfaceArea + ShellSplitter directly — see web-next/CustomShell.
export function DefaultShell() {
  const layout = useLayout();
  const surfaces = layout.surfaces;
  const sidebarLeftWidth = surfaces['sidebar:left']?.size ?? 240;
  const sidebarRightWidth = surfaces['sidebar:right']?.size ?? 280;
  const panelBottomHeight = surfaces['panel:bottom']?.size ?? 200;
  const sidebarLeftVisible = surfaces['sidebar:left']?.visible ?? true;
  const sidebarRightVisible = surfaces['sidebar:right']?.visible ?? false;
  const panelBottomVisible = surfaces['panel:bottom']?.visible ?? false;
  const activitybarVisible = surfaces['activitybar']?.visible ?? true;
  const statusbarVisible = surfaces['statusbar']?.visible ?? true;
  const titlebarVisible = surfaces['titlebar']?.visible ?? true;

  return (
    <div
      className="oo-shell"
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        width: '100vw',
        overflow: 'hidden',
      }}
    >
      {titlebarVisible ? <SurfaceArea surface="titlebar" layout="bar" /> : null}

      <div style={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden' }}>
        {activitybarVisible ? <SurfaceArea surface="activitybar" layout="rail" /> : null}

        {sidebarLeftVisible ? (
          <>
            <SurfaceArea
              surface="sidebar:left"
              layout="stack"
              style={{ width: sidebarLeftWidth, flex: '0 0 auto', overflow: 'hidden' }}
            />
            <ShellSplitter surface="sidebar:left" orientation="vertical" min={120} max={600} />
          </>
        ) : null}

        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          <SurfaceArea
            surface="main"
            layout="tab"
            style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}
          />
          {panelBottomVisible ? (
            <>
              <ShellSplitter
                surface="panel:bottom"
                orientation="horizontal"
                invert
                min={80}
                max={500}
              />
              <SurfaceArea
                surface="panel:bottom"
                layout="tab"
                style={{
                  height: panelBottomHeight,
                  flex: '0 0 auto',
                  overflow: 'hidden',
                }}
              />
            </>
          ) : null}
        </div>

        {sidebarRightVisible ? (
          <>
            <ShellSplitter
              surface="sidebar:right"
              orientation="vertical"
              invert
              min={160}
              max={600}
            />
            <SurfaceArea
              surface="sidebar:right"
              layout="stack"
              style={{ width: sidebarRightWidth, flex: '0 0 auto', overflow: 'hidden' }}
            />
          </>
        ) : null}
      </div>

      {statusbarVisible ? <SurfaceArea surface="statusbar" layout="bar" /> : null}

      <SurfaceArea
        surface="overlay"
        layout="floating"
        style={{
          position: 'fixed',
          inset: 0,
          pointerEvents: 'none',
          zIndex: 1000,
        }}
      />
    </div>
  );
}
