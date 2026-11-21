import type { Scena } from '@softov/scena/types';
import { combineDisposables } from '@softov/scena';
import Explorer from './Explorer.js';
import SessionView from './SessionView.js';
import { sessionsDataProvider } from './data.js';
import { sessionCommands } from './commands.js';

// A simulation of agent sessions: a list in the left sidebar, and a session
// view that opens in the main area, the right sidebar or a window. It is for
// trying where a session opens and moves; a chat view or a composer built on
// scena can draw into the same view later.
export function registerSessions(scena: Scena) {
  return combineDisposables(
    scena.store.registerDataProvider(sessionsDataProvider),
    scena.components.register({
      component: 'SessionExplorer',
      category: 'page',
      renderer: { kind: 'react', load: async () => ({ default: Explorer as unknown }) },
    }),
    scena.components.register({
      component: 'SessionView',
      category: 'page',
      renderer: { kind: 'react', load: async () => ({ default: SessionView as unknown }) },
      props: { icon: '\u{1F4AC}', color: 'violet' },
    }),
    ...sessionCommands.map((c) => scena.commands.register(c)),
    scena.surfaces.mount({
      surface: 'activitybar',
      key: 'sessions:activitybar',
      resource: {
        component: 'ActivityBarItem',
        icon: '\u{1F4AC}\u{FE0E}',
        label: 'Sessions',
        section: 'sessions',
        onClick: { functionCall: { call: 'sidebar.activate', args: { section: 'sessions' } } },
      },
    }),
    scena.surfaces.mount({
      surface: 'sidebar:left',
      key: 'sessions:explorer',
      when: '$/layout/surfaces/sidebar:left/section == "sessions"',
      resource: { component: 'SessionExplorer' },
    }),
    // A session tab sets the active session, as a user tab sets the user.
    scena.events.on('scena:mount:focused', (raw) => {
      const { key } = raw as { key: string };
      if (!key.startsWith('session:')) return;
      scena.store.patchMany({ '$/active/kind': 'session', '$/active/id': key.slice('session:'.length) });
    }),
  );
}
