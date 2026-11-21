import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useScena } from './ScenaProvider.js';
import { useLayout } from './hooks/useLayout.js';
import { useMounts } from './hooks/useMounts.js';
import { OwnerDocumentProvider } from './OwnerDocument.js';
import { SurfaceArea } from './SurfaceArea.js';
import { mirrorStyles } from './window-styles.js';
import { BlockedWindows } from './BlockedWindows.js';
import type { Scena } from '../sdk/scena.js';
import type { SurfaceName } from '../sdk/mount-surface.js';
import { isWindowSurface, removeSurface, type WindowBounds } from '../sdk/window-surface.js';

// Draws each window surface in a browser window of its own.
//
// A surface whose name is `window:<id>` and whose state has `window` is one
// (see sdk/window-surface.ts). For each, this opens `about:blank` at the
// state's place and size, copies the main window's styles into it, and
// renders the surface there through a portal, from THIS page: the window
// shares the one scena, its store and the app's connections, and a tab drags
// between it and `main` as between any two surfaces.
//
// Closing:
// - A person closes the window: its tabs go to `main`, and the surface leaves
//   the layout.
// - The main page reloads or closes: the windows close with it, and their
//   surfaces stay in the layout, so the next load opens them again.
// - The surface leaves the layout (its last tab moved out): the window closes.
//
// The browser may refuse a window that no click opened, as on a reload. Then
// `scena:window:blocked` is emitted and the surface waits in `blocked`;
// `openBlocked`, called from a click, opens them.
//
// DefaultShell renders this. An app with its own shell renders it once.

const CHECK_MS = 1000;
const MIN_SIZE = 200;

interface Opened {
  window: Window;
  container: HTMLElement;
  dispose: () => void;
}

function readBounds(win: Window): WindowBounds {
  return { left: win.screenX, top: win.screenY, width: win.innerWidth, height: win.innerHeight };
}

function sameBounds(a: WindowBounds | undefined, b: WindowBounds): boolean {
  return a !== undefined && a.left === b.left && a.top === b.top && a.width === b.width && a.height === b.height;
}

function features(bounds: WindowBounds): string {
  const width = Math.max(MIN_SIZE, Math.round(bounds.width));
  const height = Math.max(MIN_SIZE, Math.round(bounds.height));
  return `popup=yes,left=${Math.round(bounds.left)},top=${Math.round(bounds.top)},width=${width},height=${height}`;
}

// Firefox opens a blank window for an empty URL; the others for `about:blank`.
function blankUrl(): string {
  return typeof navigator !== 'undefined' && /firefox/i.test(navigator.userAgent) ? '' : 'about:blank';
}

// The surface's mounts go to `main`, and the surface leaves the layout.
export function closeWindowSurface(scena: Scena, surface: SurfaceName): void {
  for (const mount of scena.surfaces.listAt(surface)) {
    scena.surfaces.move({ key: mount.key, toSurface: 'main', fromSurface: surface });
  }
  scena.layout.set(removeSurface(scena.layout.get(), surface));
}

export interface SurfaceWindowsProps {
  // Draws the notice for windows the browser blocked, in place of
  // BlockedWindows. `openBlocked` must run in a click handler.
  renderBlocked?: (blocked: SurfaceName[], openBlocked: () => void, dismiss: () => void) => ReactNode;
}

export function SurfaceWindows({ renderBlocked = defaultBlocked }: SurfaceWindowsProps = {}) {
  const scena = useScena();
  const layout = useLayout();
  const opened = useRef(new Map<SurfaceName, Opened>());
  const leaving = useRef(false);
  const pendingClose = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [, setTick] = useState(0);
  const [blocked, setBlocked] = useState<SurfaceName[]>([]);
  const rerender = useCallback(() => setTick((n) => n + 1), []);

  // Joined, so the effect below runs when the set of windows changes, not on
  // every layout write (a bounds check writes once a second).
  const wantedKey = Object.entries(layout.surfaces)
    .filter(([name, state]) => isWindowSurface(name) && state?.window !== undefined && state.visible !== false)
    .map(([name]) => name)
    .join('\n');
  const wanted = useMemo(() => (wantedKey === '' ? [] : wantedKey.split('\n')), [wantedKey]);

  const close = useCallback((surface: SurfaceName) => {
    const one = opened.current.get(surface);
    if (!one) return;
    opened.current.delete(surface);
    one.dispose();
    if (!one.window.closed) one.window.close();
    scena.events.emit('scena:window:closed', { surface, window: one.window });
  }, [scena]);

  // Opens one window. False when the browser blocked it.
  const open = useCallback((surface: SurfaceName): boolean => {
    if (opened.current.has(surface)) return true;
    const bounds = scena.layout.get().surfaces[surface]?.window;
    if (!bounds) return true;
    const win = window.open(blankUrl(), '', features(bounds));
    if (!win) return false;

    const doc = win.document;
    doc.title = surface;
    const container = doc.createElement('div');
    container.className = 'oo-surface-window';
    container.style.cssText = 'position:fixed;inset:0;display:flex;flex-direction:column;';
    doc.body.style.margin = '0';
    doc.body.appendChild(container);
    const styles = mirrorStyles(document, doc);

    let last = readBounds(win);
    const keepBounds = () => {
      if (win.closed) return;
      const now = readBounds(win);
      if (sameBounds(last, now)) return;
      last = now;
      scena.layout.setSurface(surface, { window: now });
    };
    const timer = setInterval(() => {
      if (win.closed) {
        onGone();
        return;
      }
      keepBounds();
    }, CHECK_MS);
    // A person closed it, or the page is leaving and closed it.
    const onGone = () => {
      if (!opened.current.has(surface)) return;
      if (leaving.current) {
        close(surface);
        return;
      }
      close(surface);
      closeWindowSurface(scena, surface);
    };
    win.addEventListener('resize', keepBounds);
    win.addEventListener('pagehide', onGone);

    opened.current.set(surface, {
      window: win,
      container,
      dispose: () => {
        clearInterval(timer);
        styles.dispose();
        win.removeEventListener('resize', keepBounds);
        win.removeEventListener('pagehide', onGone);
      },
    });
    scena.events.emit('scena:window:opened', { surface, window: win });
    rerender();
    return true;
  }, [scena, close, rerender]);

  // Open what the layout wants, close what it no longer does.
  useEffect(() => {
    const want = new Set(wanted);
    for (const surface of [...opened.current.keys()]) {
      if (!want.has(surface)) close(surface);
    }
    const refused: SurfaceName[] = [];
    for (const surface of wanted) {
      if (opened.current.has(surface)) continue;
      if (!open(surface)) refused.push(surface);
    }
    for (const surface of refused) scena.events.emit('scena:window:blocked', { surface });
    setBlocked((cur) => {
      const next = [...cur.filter((s) => want.has(s) && !opened.current.has(s)), ...refused.filter((s) => !cur.includes(s))];
      return next.length === cur.length && next.every((s, i) => s === cur[i]) ? cur : next;
    });
    rerender();
  }, [wanted, open, close, scena, rerender]);

  // A window surface with no place and no window is left over: a removed
  // surface whose layout was still drawn wrote its tab tree back, and
  // `setSurface` made the surface again. Remove it once its window is gone.
  useEffect(() => {
    const stale = Object.entries(layout.surfaces)
      .filter(([name, state]) => isWindowSurface(name) && state?.window === undefined && !opened.current.has(name))
      .map(([name]) => name);
    if (stale.length === 0) return;
    let next = scena.layout.get();
    for (const name of stale) next = removeSurface(next, name);
    scena.layout.set(next);
  }, [layout, scena]);

  // The page leaving closes the windows, and keeps their surfaces.
  useEffect(() => {
    const onLeave = () => {
      leaving.current = true;
      for (const surface of [...opened.current.keys()]) close(surface);
    };
    const onBack = () => {
      leaving.current = false;
    };
    window.addEventListener('pagehide', onLeave);
    window.addEventListener('pageshow', onBack);
    return () => {
      window.removeEventListener('pagehide', onLeave);
      window.removeEventListener('pageshow', onBack);
    };
  }, [close]);

  // Unmounting closes the windows without touching the layout. A tick later,
  // so React's development remount does not close and reopen them: the
  // reopen would have no click to let it through.
  useEffect(() => {
    const all = opened.current;
    clearTimeout(pendingClose.current);
    leaving.current = false;
    return () => {
      pendingClose.current = setTimeout(() => {
        leaving.current = true;
        for (const surface of [...all.keys()]) close(surface);
      }, 0);
    };
  }, [close]);

  // In the click handler of a notice: a click lets the browser open them.
  const openBlocked = useCallback(() => {
    const still = blocked.filter((surface) => !open(surface));
    setBlocked(still);
  }, [blocked, open]);
  const dismiss = useCallback(() => {
    for (const surface of blocked) closeWindowSurface(scena, surface);
    setBlocked([]);
  }, [blocked, scena]);

  return (
    <>
      {[...opened.current.entries()].map(([surface, one]) =>
        createPortal(
          <OwnerDocumentProvider document={one.window.document}>
            <WindowSurface surface={surface} window={one.window} />
          </OwnerDocumentProvider>,
          one.container,
          surface,
        ),
      )}
      {blocked.length > 0 ? renderBlocked(blocked, openBlocked, dismiss) : null}
    </>
  );
}

function defaultBlocked(blocked: SurfaceName[], openBlocked: () => void, dismiss: () => void): ReactNode {
  return <BlockedWindows blocked={blocked} onOpen={openBlocked} onDismiss={dismiss} />;
}

// One window's surface. It names the window after its active tab, and
// removes the surface once the last tab has left it.
function WindowSurface({ surface, window: win }: { surface: SurfaceName; window: Window }) {
  const scena = useScena();
  const layout = useLayout();
  const mounts = useMounts(surface);
  const hadTabs = useRef(false);

  const active = layout.surfaces[surface]?.activeContainerKey;
  const shown = mounts.find((m) => m.key === active) ?? mounts[mounts.length - 1];
  const title = shown?.props?.title;
  useEffect(() => {
    win.document.title = typeof title === 'string' ? title : shown?.key ?? surface;
  }, [win, title, shown, surface]);

  // Only after it held a tab: on a reload the surface is drawn before the
  // app reopens its tabs, and an empty window then is not one to close.
  useEffect(() => {
    if (mounts.length > 0) {
      hadTabs.current = true;
      return;
    }
    if (hadTabs.current) scena.layout.set(removeSurface(scena.layout.get(), surface));
  }, [mounts.length, scena, surface]);

  return <SurfaceArea surface={surface} layout="tab-panel" role="main" style={{ flex: 1, minHeight: 0, overflow: 'hidden' }} />;
}
