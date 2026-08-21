import type { Disposable, Scena } from '@softov/scena/types';
import { combineDisposables, isOverlaid, resolveSurfacePresentation } from '@softov/scena';
import type { ModusClass } from '@softov/scena';
import { useStore } from '@softov/scena/react';
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
 * and a live readout of what the presentation policy resolves to.
 */

function AppTitle({ text }: { text?: string }) {
  return <span className="demo-title">{text ?? 'scena demo'}</span>;
}

/**
 * What the policy resolves to at the current size, live.
 *
 * This started as a complaint: DefaultShell rendered from `visible`/`size` and
 * never consulted a policy, so it read `policy wants floating · shell still
 * docked` and stayed that way. The shell reads the policy now, so it is a
 * readout rather than a gap -- kept because a size class you can see is the
 * fastest way to check the responsive behaviour by hand.
 */
function PresentationProbe() {
  const modus = useStore<ModusClass>('$/modus/class') ?? 'large';
  const wanted = resolveSurfacePresentation('sidebar:left', modus, DEMO_PRESENTATION);
  return (
    <span className="demo-status-item">
      {modus} · sidebar <strong>{wanted}</strong>
      {isOverlaid(wanted) ? ' (over main)' : ''}
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
    // The same ButtonBar the title bar uses. It is smaller and quieter in both
    // bars, from `[data-surface-role='bar']` -- the role the shell stamps,
    // not a prop and not the surface's name.
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
