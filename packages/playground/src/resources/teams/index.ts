import type { Scena } from '@softov/scena/types';
import { combineDisposables } from '@softov/scena';
import Explorer from './Explorer.js';
import Detail from './Detail.js';
import { teamsDataProvider } from './data.js';
import { teamCommands } from './commands.js';

export function registerTeams(scena: Scena) {
  const subs = [
    scena.store.registerDataProvider(teamsDataProvider),

    scena.components.register({
      component: 'TeamExplorer',
      category: 'page',
      renderer: { kind: 'react', load: async () => ({ default: Explorer as unknown }) },
    }),
    scena.components.register({
      component: 'TeamDetail',
      category: 'page',
      renderer: { kind: 'react', load: async () => ({ default: Detail as unknown }) },
    }),

    ...teamCommands.map((c) => scena.commands.register(c)),

    scena.surfaces.mount({
      surface: 'activitybar',
      key: 'teams:activitybar',
      resource: {
        component: 'ActivityBarItem',
        // icon: '👥',
        icon: '\u{1F465}\u{FE0E}', // 👥️
        label: 'Teams',
        section: 'teams',
        badge: { path: '$/summary/teams/total' },
        onClick: {
          functionCall: {
            call: 'sidebar.activate',
            args: { section: 'teams' },
          },
        },
      },
    }),

    scena.surfaces.mount({
      surface: 'sidebar:left',
      key: 'teams:explorer',
      when: '$/ui/sidebar/left/section == "teams"',
      resource: { component: 'TeamExplorer' },
    }),

    scena.surfaces.mount({
      surface: 'statusbar',
      key: 'teams:selected',
      when: '$/active/kind == "team"',
      resource: {
        component: 'StatusItem',
        label: 'Team',
        value: { path: '$/active/id' },
      },
    }),
  ];

  return combineDisposables(...subs);
}
