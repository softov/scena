import type { Scena, Disposable } from '@softov/scena/types';

// Settings is a main-surface PANEL (not a sidebar explorer). The activitybar
// "⚙" button dispatches `settings.open`, which opens it as a tab.
export function registerSettings(scena: Scena, subs: Disposable[]): void {
  /* Register new Component */
  scena.components.register({
    component: 'SettingsPanel',
    category: 'page',
    renderer: {
      kind: 'react',
      load: async () => import('./SettingsPanel.js'),
    },
  });
  /* Register commands */
  scena.commands.register({
    id: 'settings.open',
    title: 'Open settings',
    run: (ctx) => {
      ctx.surfaces.open({
        surface: 'main',
        key: 'settings',
        resource: { component: 'SettingsPanel' },
      });
    },
  });
  // Bottom-right settings entry in the activitybar. Opens SettingsPanel as
  // a tab in `main` (it's a panel, not an explorer) — no `section` because
  // we're not activating a sidebar section.
  subs.push(
    scena.surfaces.mount({
      surface: 'activitybar',
      key: 'core:settings',
      resource: {
        component: 'ActivityBarItem',
        icon: '⚙',
        color: 'slate',
        label: 'Settings',
        pos: 'bottom',
        onClick: { functionCall: { call: 'settings.open' } },
      },
    }),
  );
}
