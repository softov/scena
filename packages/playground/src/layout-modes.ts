import type { Disposable, Scena, SurfaceName } from '@softov/scena/types';
import { combineDisposables } from '@softov/scena';

// All Layout-menu commands published into the single slot 'menu:layout'.
// They split into three categories — View / Modes / Zones — which is what
// ActionList already groups on (renders dividers + group labels for free).
//
//   - view.setMainLayout.<id>  category: View   — switch main render strategy
//   - mode.<id>                category: Modes  — apply a preset zone config
//                                                 (mirrors web BUILT_IN_LAYOUT_MODES)
//   - zone.toggle.<surface>    category: Zones  — toggle one surface's visibility
//
// All accept `keys` (auto-registered with the keybindings registry via the
// new Command.keys field).

const LAYOUT_SLOT = 'menu:layout';

interface ViewItem {
  id: string;
  label: string;
  icon: string;
}

const MAIN_LAYOUTS: ViewItem[] = [
  { id: 'tab',       label: 'Tabs',       icon: '▭' },
  { id: 'tab-panel', label: 'Tab groups', icon: '⊞' },
  { id: 'split',     label: 'Split',      icon: '⊟' },
  { id: 'spatial',   label: 'Spatial',    icon: '◇' },
  { id: 'stack',     label: 'Stack',      icon: '☰' },
  { id: 'single',    label: 'Single',     icon: '□' },
];

interface LayoutMode {
  id: string;
  label: string;
  icon: string;
  zones: Partial<Record<SurfaceName, boolean>>;
  keys?: string;
}

const BUILT_IN_LAYOUT_MODES: LayoutMode[] = [
  {
    id: 'default',
    label: 'Default',
    icon: '◰',
    keys: 'ctrl+k d',
    zones: {
      titlebar: true,
      activitybar: true,
      'sidebar:left': true,
      'sidebar:right': false,
      statusbar: true,
    },
  },
  {
    id: 'focus',
    label: 'Focus',
    icon: '◉',
    keys: 'ctrl+k f',
    zones: {
      titlebar: true,
      activitybar: false,
      'sidebar:left': false,
      'sidebar:right': false,
      statusbar: false,
    },
  },
  {
    id: 'zen',
    label: 'Zen',
    icon: '☯',
    keys: 'ctrl+k z',
    zones: {
      titlebar: false,
      activitybar: false,
      'sidebar:left': false,
      'sidebar:right': false,
      statusbar: false,
    },
  },
  {
    id: 'wide',
    label: 'Wide',
    icon: '↔',
    keys: 'ctrl+k w',
    zones: {
      titlebar: true,
      activitybar: true,
      'sidebar:left': false,
      'sidebar:right': false,
      statusbar: true,
    },
  },
  {
    id: 'split',
    label: 'Split View',
    icon: '⊟',
    keys: 'ctrl+k s',
    zones: {
      titlebar: true,
      activitybar: true,
      'sidebar:left': true,
      'sidebar:right': true,
      statusbar: true,
    },
  },
  {
    id: 'first-run',
    label: 'First Run',
    icon: '✦',
    zones: {
      titlebar: false,
      activitybar: false,
      'sidebar:left': false,
      'sidebar:right': false,
      statusbar: false,
    },
  },
];

interface ZoneToggle {
  surface: SurfaceName;
  label: string;
  icon: string;
  keys?: string;
}

const ZONE_TOGGLES: ZoneToggle[] = [
  { surface: 'titlebar',      label: 'Title bar',     icon: '▔' },
  { surface: 'activitybar',   label: 'Activity bar',  icon: '☰' },
  { surface: 'sidebar:left',  label: 'Left sidebar',  icon: '◧', keys: 'ctrl+b' },
  { surface: 'sidebar:right', label: 'Right sidebar', icon: '◨', keys: 'ctrl+alt+b' },
  { surface: 'panel:bottom',  label: 'Bottom panel',  icon: '▁', keys: 'ctrl+j' },
  { surface: 'statusbar',     label: 'Status bar',    icon: '▂' },
];

export function registerLayoutModes(scena: Scena): Disposable {
  const subs: Disposable[] = [];

  for (const view of MAIN_LAYOUTS) {
    subs.push(
      scena.commands.register({
        id: `view.setMainLayout.${view.id}`,
        title: view.label,
        icon: view.icon,
        category: 'View',
        slots: [LAYOUT_SLOT],
        active: (ctx) =>
          (ctx.scena.layout.get().surfaces.main?.layout ?? 'tab') === view.id,
        run: () => {
          const cur = scena.layout.get().surfaces.main;
          scena.layout.setSurface('main', { ...cur, layout: view.id });
        },
      }),
    );
  }

  for (const mode of BUILT_IN_LAYOUT_MODES) {
    subs.push(
      scena.commands.register({
        id: `mode.${mode.id}`,
        title: mode.label,
        icon: mode.icon,
        category: 'Modes',
        slots: [LAYOUT_SLOT],
        keys: mode.keys,
        run: () => {
          for (const [surface, visible] of Object.entries(mode.zones)) {
            const cur = scena.layout.get().surfaces[surface as SurfaceName];
            scena.layout.setSurface(surface as SurfaceName, { ...cur, visible });
          }
        },
      }),
    );
  }

  for (const zone of ZONE_TOGGLES) {
    subs.push(
      scena.commands.register({
        id: `zone.toggle.${zone.surface}`,
        title: zone.label,
        icon: zone.icon,
        category: 'Zones',
        slots: [LAYOUT_SLOT],
        keys: zone.keys,
        active: (ctx) => ctx.scena.layout.get().surfaces[zone.surface]?.visible ?? false,
        run: () => {
          const cur = scena.layout.get().surfaces[zone.surface];
          scena.layout.setSurface(zone.surface, { ...cur, visible: !(cur?.visible ?? false) });
        },
      }),
    );
  }

  return combineDisposables(...subs);
}
