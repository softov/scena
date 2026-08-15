import type { Scena } from '@softov/scena/types';
import { combineDisposables } from '@softov/scena';
import Explorer from './Explorer.js';
import Detail from './Detail.js';
import { usersDataProvider } from './data.js';
import { userCommands } from './commands.js';

export function registerUsers(scena: Scena) {
  const subs = [
    scena.store.registerDataProvider(usersDataProvider),

    scena.components.register({
      component: 'UserExplorer',
      category: 'page',
      renderer: { kind: 'react', load: async () => ({ default: Explorer as unknown }) },
    }),
    scena.components.register({
      component: 'UserDetail',
      category: 'page',
      renderer: { kind: 'react', load: async () => ({ default: Detail as unknown }) },
      // Default display for any user-detail mount — every opened user tab
      // inherits the 👤 glyph + blue accent without `users.open` having to
      // re-pass them. Per-mount `props.title` (set in users.open) still
      // wins where it overrides.
      props: { icon: '\u{1F464}', color: 'blue' },
    }),

    ...userCommands.map((c) => scena.commands.register(c)),

    scena.surfaces.mount({
      surface: 'activitybar',
      key: 'users:activitybar',
      resource: {
        component: 'ActivityBarItem',
        icon: '\u{1F464}\u{FE0E}', // 👤
        label: 'Users',
        section: 'users',
        badge: { path: '$/summary/users/total' },
        onClick: { functionCall: { call: 'sidebar.activate', args: { section: 'users' } } },
      },
    }),

    scena.surfaces.mount({
      surface: 'sidebar:left',
      key: 'users:explorer',
      when: '$/layout/surfaces/sidebar:left/section == "users"',
      resource: { component: 'UserExplorer' },
    }),

    scena.surfaces.mount({
      surface: 'statusbar',
      key: 'users:summary',
      resource: {
        component: 'StatusItem',
        label: 'Users',
        value: { path: '$/summary/users/total' },
      },
    }),

    scena.surfaces.mount({
      surface: 'statusbar',
      key: 'users:selected',
      when: '$/active/kind == "user"',
      resource: {
        component: 'StatusItem',
        label: 'Selected',
        value: { path: '$/active/id' },
      },
    }),

    // Menu placement is on the commands themselves now (`slots`,
    // `when` per-command). See `commands.ts`. No menu.append calls.

    // Mount-focus mirror. When a user mount becomes active (key `user:<id>`),
    // write the active user's identity to $/resource/* so commands gated on
    // `$/resource/kind == "user"` (currently `users.delete` in file:context;
    // future openWith items in view/title) fire correctly. This complements
    // the generic $/active/* writes register-shell already does — they
    // happen to agree here because parseActiveContext splits on the first
    // `:` and the kind segment is already `user`.
    scena.events.on('scena:mount:focused', (raw) => {
      const ev = raw as { key: string; surface: string };
      if (ev.surface !== 'main' || !ev.key.startsWith('user:')) return;
      const userId = ev.key.slice('user:'.length);
      scena.store.patchMany({
        '$/resource/kind': 'user',
        '$/resource/id': userId,
      });
    }),
  ];

  return combineDisposables(...subs);
}
