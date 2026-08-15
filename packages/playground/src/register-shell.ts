import type { BindingPath, Disposable, Scena } from '@softov/scena/types';
import {
  a2uiV010Converter,
  combineDisposables,
  createInMemorySocket,
  createSurfaceBridge,
  type InMemorySocket,
} from '@softov/scena';
import { registerBuiltins as registerScenaBuiltins, registerBuiltinLayouts } from '@softov/scena/ui/builtins';
import { registerChrome } from './chrome.js';
import { summaryDataProvider } from './resources/summary-data.js';
import { registerUsers } from './resources/users/index.js';
import { registerTeams } from './resources/teams/index.js';
import { registerExplorer } from './resources/explorer/index.js';
import { registerShowcase } from './showcase/index.js';
import { registerSettings } from './settings/index.js';
import { registerTheme } from './register-theme.js';
import { registerLayoutModes } from './layout-modes.js';
import { attachKeybindings } from './attach-keybindings.js';

// Shared socket — used by both the surface bridge AND the "Simulate surface"
// button in CustomShell. Module-level so both lazy chunks see the same one.
export const surfaceSocket: InMemorySocket = createInMemorySocket();

function parseActiveContext(key: string): { kind: string; id: string } {
  const colon = key.indexOf(':');
  if (colon === -1) return { kind: 'unknown', id: key };
  return { kind: key.slice(0, colon), id: key.slice(colon + 1) };
}

// Shell phase: everything that's only needed once the user has signed in.
export function registerShell(scena: Scena): Disposable {
  const subs: Disposable[] = [];

  // Component catalog + layout strategies — registered here (not at boot) so
  // they're only pulled once the shell actually needs to render via the
  // registry. ViewMount awaits late registrations, so chrome below is safe.
  subs.push(registerBuiltinLayouts(scena));
  subs.push(registerScenaBuiltins(scena));

  subs.push(registerTheme(scena));
  registerChrome(scena);
  subs.push(registerLayoutModes(scena));
  subs.push(attachKeybindings(scena));

  // Eager summary provider FIRST — activitybar badges + statusbar values
  // read from $/summary/* and need data immediately, before any explorer
  // is opened. Resource providers (users/teams) stay lazy and re-set the
  // counts to the real value when they load.
  subs.push(scena.store.registerDataProvider(summaryDataProvider));

  subs.push(registerUsers(scena));
  subs.push(registerTeams(scena));
  subs.push(registerExplorer(scena));
  registerShowcase(scena, subs);
  registerSettings(scena, subs);

  subs.push(scena.converters.register(a2uiV010Converter));
  subs.push(
    createSurfaceBridge({
      store: scena.store,
      surfaces: scena.surfaces,
      converters: scena.converters,
      socket: surfaceSocket,
      events: scena.events,
    }),
  );

  // Simulator reply path (for the "Simulate surface" button).
  let counter = 0;
  subs.push(
    surfaceSocket.onOutgoing('surface:event', (raw) => {
      const ev = raw as { surfaceId: string; name: string };
      if (ev.name === 'increment') {
        counter += 1;
        surfaceSocket.dispatch('surface:update', {
          surfaceId: ev.surfaceId,
          path: 'counter',
          value: counter,
        });
        surfaceSocket.dispatch('surface:update', {
          surfaceId: ev.surfaceId,
          path: 'lastEvent',
          value: `received "${ev.name}" at ${new Date().toLocaleTimeString()}`,
        });
      } else if (ev.name === 'close') {
        surfaceSocket.dispatch('surface:delete', { surfaceId: ev.surfaceId });
        counter = 0;
      }
    }),
  );

  // Titlebar entries — single `titlebar` surface, BarLayout buckets by
  // the `slot` prop on each component node ('left' | 'center' | 'right',
  // defaults to 'center'). Same pattern any app/plugin uses to append.
  subs.push(
    scena.surfaces.mount({
      surface: 'titlebar',
      key: 'core:app-title',
      resource: { component: 'AppTitle', slot: 'left', text: 'scena · dev playground' },
    }),
  );
  subs.push(
    scena.surfaces.mount({
      surface: 'titlebar',
      key: 'core:main-layout',
      resource: { component: 'MainLayoutSelect', slot: 'right' },
    }),
  );
  subs.push(
    scena.surfaces.mount({
      surface: 'titlebar',
      key: 'core:toggle-sidebar-left',
      resource: {
        component: 'SurfaceToggle',
        slot: 'right',
        surface: 'sidebar:left',
        icon: '◧',
        label: 'Toggle left sidebar',
      },
    }),
  );
  subs.push(
    scena.surfaces.mount({
      surface: 'titlebar',
      key: 'core:toggle-sidebar-right',
      resource: {
        component: 'SurfaceToggle',
        slot: 'right',
        surface: 'sidebar:right',
        icon: '◨',
        label: 'Toggle right sidebar',
      },
    }),
  );
  subs.push(
    scena.surfaces.mount({
      surface: 'titlebar',
      key: 'core:theme-picker',
      resource: { component: 'ThemePicker', slot: 'right' },
    }),
  );
  subs.push(
    scena.surfaces.mount({
      surface: 'titlebar',
      key: 'core:theme-toggle',
      resource: { component: 'ThemeToggle', slot: 'right' },
    }),
  );
  subs.push(
    scena.surfaces.mount({
      surface: 'titlebar',
      key: 'core:simulate-surface',
      resource: { component: 'SimulateButton', slot: 'right' },
    }),
  );

  // Active-mount tracking.
  subs.push(
    scena.events.on('scena:mount:focused', (raw) => {
      const ev = raw as { key: string; surface: string };
      if (ev.surface !== 'main') return;
      const { kind, id } = parseActiveContext(ev.key);
      scena.store.patchMany({ '$/active/kind': kind, '$/active/id': id });
    }),
  );
  subs.push(
    scena.events.on('scena:mount:closed', (raw) => {
      const ev = raw as { key: string };
      const activeId = scena.store.get<string>('$/active/id');
      const activeKind = scena.store.get<string>('$/active/kind');
      if (!activeId || !activeKind) return;
      if (ev.key === `${activeKind}:${activeId}`) {
        scena.store.patchMany({ '$/active/kind': null, '$/active/id': null });
      }
    }),
  );

  // Snap back to `showcase` instead of leaving the sidebar empty.
  const KNOWN_SECTIONS = new Set(['showcase', 'users', 'teams', 'explorer']);
  const currentSection = scena.store.get<string>('$/ui/sidebar/left/section' as BindingPath);
  if (currentSection === undefined || !KNOWN_SECTIONS.has(currentSection)) {
    scena.store.set('$/ui/sidebar/left/section' as BindingPath, 'showcase');
  }

  // Per-section layout + container header for sidebar:left. Single-mount
  // sections look best as `single` with no header strip; the explorer has
  // two mounts (Files + Event log) and uses `stack` plus a "EXPLORER"
  // container strip (with a `[...]` show/hide menu in the header).
  interface SectionShell {
    layout: string;
    container?: { title: string; icon?: string; color?: string };
  }
  const SECTION_SHELL: Record<string, SectionShell> = {
    explorer: {
      layout: 'stack',
      container: { title: 'Explorer', icon: '\u{1F4C1}\u{FE0E}', color: 'amber' },
    },
  };
  function applySidebarShell() {
    const section = scena.store.get<string>('$/ui/sidebar/left/section' as BindingPath) ?? '';
    const shell: SectionShell = SECTION_SHELL[section] ?? { layout: 'single' };
    const cur = scena.layout.get().surfaces['sidebar:left'];
    const nextStack = shell.container ? { ...cur?.stack, container: shell.container } : undefined;
    if (cur?.layout === shell.layout && cur?.stack?.container === shell.container) return;
    scena.layout.setSurface('sidebar:left', { ...cur, layout: shell.layout, stack: nextStack });
  }
  applySidebarShell();
  subs.push(
    scena.store.subscribe('$/ui/sidebar/left/section' as BindingPath, applySidebarShell),
  );

  if (import.meta.env.DEV) {
    (window as unknown as { scena: Scena; surfaceSocket: InMemorySocket }).scena = scena;
    (window as unknown as { scena: Scena; surfaceSocket: InMemorySocket }).surfaceSocket =
      surfaceSocket;
  }

  return combineDisposables(...subs);
}
