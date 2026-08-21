import type { Command, Disposable, Scena } from '@softov/scena/types';
import { combineDisposables } from '@softov/scena';
import Explorer from './Explorer.js';
import Detail from './Detail.js';
import { notesDataProvider } from './data.js';

const ICON = '\u{1F4DD}\u{FE0E}';

const commands: Command[] = [
  {
    id: 'notes.open',
    title: 'Open Note',
    category: 'Notes',
    run: (ctx, args) => {
      const noteId = (args as { noteId?: string } | undefined)?.noteId;
      if (!noteId) return;
      ctx.store.patchMany({ '$/active/id': noteId, '$/active/kind': 'note' });
      ctx.surfaces.open({
        surface: 'main',
        key: `note:${noteId}`,
        resource: { component: 'NoteDetail', noteId },
      });
    },
  },
];

export function registerNotes(scena: Scena): Disposable {
  return combineDisposables(
    scena.store.registerDataProvider(notesDataProvider),

    scena.components.register({
      component: 'NoteExplorer',
      category: 'page',
      renderer: { kind: 'react', load: async () => ({ default: Explorer as unknown }) },
    }),
    scena.components.register({
      component: 'NoteDetail',
      category: 'page',
      renderer: { kind: 'react', load: async () => ({ default: Detail as unknown }) },
    }),

    ...commands.map((c) => scena.commands.register(c)),

    scena.surfaces.mount({
      surface: 'activitybar',
      key: 'notes:nav',
      resource: {
        component: 'ActivityBarItem',
        icon: ICON,
        label: 'Notes',
        section: 'notes',
        badge: { path: '$/summary/notes/total' },
        onClick: { functionCall: { call: 'sidebar.activate', args: { section: 'notes' } } },
      },
    }),

    scena.surfaces.mount({
      surface: 'sidebar:left',
      key: 'notes:explorer',
      when: '$/layout/surfaces/sidebar:left/section == "notes"',
      resource: { component: 'NoteExplorer' },
    }),
  );
}
