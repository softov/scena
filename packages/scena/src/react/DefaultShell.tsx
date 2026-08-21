import type { CSSProperties } from 'react';
import type { PresentationPolicy } from '../core/graph/surface-presentation.js';
import { isOverlaid, resolveSurfacePresentation } from '../core/graph/surface-presentation.js';
import type { ModusClass } from '../core/store/backends/modus-backend.js';
import type { SurfaceName } from '../sdk/mount-surface.js';
import { useScena } from './ScenaProvider.js';
import { useLayout } from './hooks/useLayout.js';
import { useStore } from './hooks/useStore.js';
import { SurfaceArea } from './SurfaceArea.js';

export interface DefaultShellProps {
  /**
   * How this app's surfaces occupy space as the viewport narrows.
   *
   * scena ships the mechanism and no policy: whether a right sidebar floats
   * before a left one is a claim about a specific app's information
   * architecture. With none, every surface stays `docked` at every size, which
   * is what this shell did before it read a policy at all.
   */
  presentation?: PresentationPolicy;
  /**
   * Clicking the scrim closes whatever is overlaying `main`.
   *
   * On by default because a drawer that cannot be dismissed by tapping beside
   * it is a trap on the size of screen that produces drawers in the first
   * place. Pass false for an app that wants a modal drawer.
   */
  dismissOnScrim?: boolean;
}

// Surfaces that can end up lifted over `main`, in the order the scrim closes
// them. `main`, the bars and the rail are never overlaid by this shell -- a
// `bar` presentation keeps occupying its edge, so nothing covers anything.
const OVERLAYABLE: SurfaceName[] = ['sidebar:left', 'sidebar:right', 'panel:bottom'];

/**
 * Minimal flex shell.
 *
 * Each surface renders through `SurfaceArea`, which delegates to the layout
 * registered for it (tab / split / stack / rail / inline / floating), and is
 * stamped with the edge it closes on and the kind of region it is so that CSS
 * can style it without matching its name.
 *
 * Two things it deliberately does itself rather than leaving to the app,
 * because every app was otherwise writing them:
 *
 *   - it resolves the presentation policy per surface, so a sidebar lifts over
 *     `main` on a narrow viewport instead of taking width from it;
 *   - it renders the scrim when something is lifted, and closes on a click.
 *
 * Resizing is by each surface's own edge (`SurfaceArea`'s `resize` prop) rather
 * than by a `ShellSplitter` placed beside it. The two are alternatives: a
 * splitter is an element between two surfaces, which means a shell has to know
 * the arrangement well enough to place one, and it has nothing to sit against
 * once a surface floats. Self-edge resize travels with the surface and stands
 * down on its own when the presentation is not `docked`. `ShellSplitter` is
 * still exported for shells that want the explicit version.
 *
 * An app that wants different chrome composes `SurfaceArea` itself -- see the
 * playground's CustomShell.
 */
export function DefaultShell({ presentation, dismissOnScrim = true }: DefaultShellProps = {}) {
  const scena = useScena();
  const layout = useLayout();
  const surfaces = layout.surfaces;

  // `$/modus/class` is published by the modus backend. Without it registered
  // there is no size class to resolve against, and `large` keeps everything
  // docked -- the same as having no policy.
  const modus = useStore<ModusClass>('$/modus/class') ?? 'large';

  const presentationOf = (surface: SurfaceName) =>
    resolveSurfacePresentation(surface, modus, presentation);

  const sidebarLeftWidth = surfaces['sidebar:left']?.size ?? 240;
  const sidebarRightWidth = surfaces['sidebar:right']?.size ?? 280;
  const panelBottomHeight = surfaces['panel:bottom']?.size ?? 200;
  const sidebarLeftVisible = surfaces['sidebar:left']?.visible ?? true;
  const sidebarRightVisible = surfaces['sidebar:right']?.visible ?? false;
  const panelBottomVisible = surfaces['panel:bottom']?.visible ?? false;
  const activitybarVisible = surfaces['activitybar']?.visible ?? true;
  const statusbarVisible = surfaces['statusbar']?.visible ?? true;
  const titlebarVisible = surfaces['titlebar']?.visible ?? true;

  const leftPresentation = presentationOf('sidebar:left');
  const rightPresentation = presentationOf('sidebar:right');
  const bottomPresentation = presentationOf('panel:bottom');

  const visibleOf: Record<string, boolean> = {
    'sidebar:left': sidebarLeftVisible,
    'sidebar:right': sidebarRightVisible,
    'panel:bottom': panelBottomVisible,
  };

  // Something is over `main` right now. `bar` is excluded by `isOverlaid`,
  // which is the point of asking it rather than comparing the size class:
  // a rail rotated to the bottom edge still occupies that edge.
  const lifted = OVERLAYABLE.filter(
    (surface) => visibleOf[surface] && isOverlaid(presentationOf(surface)),
  );

  // An overlaid surface takes no width from `main`, so the flex sizing that
  // would reserve it has to stand down as well -- otherwise the drawer floats
  // over a `main` that is still short by the drawer's width.
  const dockedStyle = (
    docked: boolean,
    style: CSSProperties,
  ): CSSProperties | undefined => (docked ? style : undefined);

  function closeLifted(): void {
    for (const surface of lifted) {
      scena.layout.setSurface(surface, { ...surfaces[surface], visible: false });
    }
  }

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
      {titlebarVisible ? (
        <SurfaceArea surface="titlebar" layout="bar" role="bar" edge="block-end" />
      ) : null}

      {/* `position: relative` so a lifted surface positions against the shell
          body rather than the viewport, and the scrim covers this region
          rather than the bars above and below it. */}
      <div
        style={{
          display: 'flex',
          flex: 1,
          minHeight: 0,
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {activitybarVisible ? (
          <SurfaceArea
            surface="activitybar"
            layout="rail"
            role="rail"
            edge="inline-end"
            presentation={presentationOf('activitybar')}
          />
        ) : null}

        {sidebarLeftVisible ? (
          <SurfaceArea
            surface="sidebar:left"
            layout="stack"
            role="panel"
            edge="inline-end"
            presentation={leftPresentation}
            resize={{ edge: 'right', min: 120, max: 600 }}
            style={dockedStyle(!isOverlaid(leftPresentation), {
              width: sidebarLeftWidth,
              flex: '0 0 auto',
              overflow: 'hidden',
            })}
          />
        ) : null}

        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          <SurfaceArea
            surface="main"
            layout="tab"
            role="main"
            style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}
          />
          {panelBottomVisible ? (
            <SurfaceArea
              surface="panel:bottom"
              layout="tab"
              role="panel"
              edge="block-start"
              presentation={bottomPresentation}
              resize={{ edge: 'top', min: 80, max: 500 }}
              style={dockedStyle(!isOverlaid(bottomPresentation), {
                height: panelBottomHeight,
                flex: '0 0 auto',
                overflow: 'hidden',
              })}
            />
          ) : null}
        </div>

        {sidebarRightVisible ? (
          <SurfaceArea
            surface="sidebar:right"
            layout="stack"
            role="panel"
            edge="inline-start"
            presentation={rightPresentation}
            resize={{ edge: 'left', min: 160, max: 600 }}
            style={dockedStyle(!isOverlaid(rightPresentation), {
              width: sidebarRightWidth,
              flex: '0 0 auto',
              overflow: 'hidden',
            })}
          />
        ) : null}

        {/* Under the lifted surface (z-index 30 in surface.css) and over
            everything else, so the drawer stays readable and the rest is
            visibly out of reach.
            
            A <button> when it dismisses, because a clickable <div> cannot be
            reached by keyboard and "tap beside it to close" is then only true
            for people using a pointer. surface.css already resets border and
            padding on it, which is the shape a button needs. Inert when it
            does not dismiss -- a focusable control that does nothing is worse
            than none. */}
        {lifted.length > 0 ? (
          dismissOnScrim ? (
            <button
              type="button"
              className="oo-surface-scrim"
              aria-label="Close"
              onClick={closeLifted}
            />
          ) : (
            <div className="oo-surface-scrim" aria-hidden="true" />
          )
        ) : null}
      </div>

      {statusbarVisible ? (
        <SurfaceArea surface="statusbar" layout="bar" role="bar" edge="block-start" />
      ) : null}

      <SurfaceArea
        surface="overlay"
        layout="floating"
        role="overlay"
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
