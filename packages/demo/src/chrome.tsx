import type { Disposable, Scena } from '@softov/scena/types';
import { combineDisposables, isOverlaid, resolveSurfacePresentation } from '@softov/scena';
import type { ModusClass } from '@softov/scena';
import { useLayout, useStore } from '@softov/scena/react';
import { DEMO_PRESENTATION } from './presentation.js';

import './chrome.css';

/**
 * What is left of the app chrome once scena ships the parts every app was
 * writing for itself.
 *
 * `ActivityBarItem`, `ButtonBar`, `ThemePicker` and `ThemeModeToggle` now come
 * from the catalog -- this file used to carry its own `ActivityBarItem` and
 * `StatusItem`, which was the third copy of each. Both are gone; the mounts in
 * register-app.ts and the resource modules reference the builtin names and
 * nothing here implements them.
 *
 * What remains is the two things that genuinely belong to this app: its title,
 * and a probe for a gap that has not been closed yet.
 */

function AppTitle({ text }: { text?: string }) {
  return <span className="demo-title">{text ?? 'scena demo'}</span>;
}

/**
 * The open gap, made visible instead of only written down.
 *
 * Resolves the presentation this app's policy asks for at the current size
 * class, and reports it next to what the shell is actually doing. Narrow the
 * window: this reads `floating` (or `sheet`) while DefaultShell keeps the
 * sidebar docked and taking width from `main`, because DefaultShell renders
 * from `visible`/`size` and never consults a policy.
 *
 * Advisor closes that gap in shell/compact.ts. Nothing equivalent ships, which
 * is what this app exists to make obvious.
 */
function PresentationProbe() {
  const modus = useStore<ModusClass>('$/modus/class') ?? 'large';
  const layout = useLayout();
  const wanted = resolveSurfacePresentation('sidebar:left', modus, DEMO_PRESENTATION);
  const docked = layout.surfaces['sidebar:left']?.visible ?? true;
  const mismatch = isOverlaid(wanted) && docked;
  return (
    <span className="demo-status-item" data-warn={mismatch}>
      {modus} · policy wants <strong>{wanted}</strong>
      {mismatch ? ' · shell still docked' : ''}
    </span>
  );
}

export function registerChrome(scena: Scena): Disposable {
  return combineDisposables(
    scena.components.register({
      component: 'PresentationProbe',
      category: 'inline',
      renderer: { kind: 'react', load: async () => ({ default: PresentationProbe as unknown }) },
    }),
    scena.components.register({
      component: 'AppTitle',
      category: 'inline',
      renderer: { kind: 'react', load: async () => ({ default: AppTitle as unknown }) },
    }),

    scena.surfaces.mount({
      surface: 'titlebar',
      key: 'chrome:title',
      resource: { component: 'AppTitle', slot: 'left', text: 'scena demo' },
    }),

    // Both theme controls are catalog components now, bound to the store paths
    // registerThemeController owns. Neither knows the other exists; they agree
    // because they read the same two paths.
    scena.surfaces.mount({
      surface: 'titlebar',
      key: 'chrome:theme-picker',
      resource: { component: 'ThemePicker', slot: 'right', compact: true },
    }),
    scena.surfaces.mount({
      surface: 'titlebar',
      key: 'chrome:theme-mode',
      resource: { component: 'ThemeModeToggle', slot: 'right' },
    }),

    scena.surfaces.mount({
      surface: 'statusbar',
      key: 'chrome:presentation',
      resource: { component: 'PresentationProbe' },
    }),
    // The same ButtonBar the title bar uses; the status bar styles it smaller
    // and quieter through `.oo-bar--statusbar`, not through a prop.
    scena.surfaces.mount({
      surface: 'statusbar',
      key: 'chrome:notes-count',
      resource: {
        component: 'ButtonBar',
        icon: '\u{1F4DD}\u{FE0E}',
        label: 'Notes',
        value: { path: '$/summary/notes/total' },
        command: 'sidebar.activate',
        args: { section: 'notes' },
      },
    }),
    scena.surfaces.mount({
      surface: 'statusbar',
      key: 'chrome:toggle-left',
      resource: {
        component: 'ButtonBar',
        icon: '\u{25E7}\u{FE0E}',
        title: 'Toggle sidebar',
        command: 'sidebar.toggleLeft',
      },
    }),
  );
}
