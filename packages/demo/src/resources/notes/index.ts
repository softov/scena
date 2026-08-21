import type { BindingPath, Command, CommandContext, Disposable, Scena } from '@softov/scena/types';
import { combineDisposables } from '@softov/scena';
import Explorer from './Explorer.js';
import Detail from './Detail.js';
import { notesDataProvider } from './data.js';

const ICON = '\u{1F4DD}\u{FE0E}';

// The slot the explorer's right-click menu queries, and the path it injects the
// clicked note into. A menu command reads the note from the store rather than
// from an argument, because the picker runs commands by id with no arguments of
// its own -- the context IS the argument.
export const NOTE_MENU_SLOT = 'note:context';
export const NOTE_MENU_TARGET = '$/menu/note/id' as BindingPath;

function targetId(ctx: CommandContext): string | undefined {
  return ctx.store.get<string>(NOTE_MENU_TARGET);
}

const commands: Command[] = [
  {
    id: 'notes.open',
    title: 'Open',
    icon: '\u{2197}\u{FE0E}',
    category: 'Notes',
    slots: [NOTE_MENU_SLOT],
    run: (ctx, args) => {
      const noteId = (args as { noteId?: string } | undefined)?.noteId ?? targetId(ctx);
      if (!noteId) return;
      ctx.store.patchMany({ '$/active/id': noteId, '$/active/kind': 'note' });
      ctx.surfaces.open({
        surface: 'main',
        key: `note:${noteId}`,
        resource: { component: 'NoteDetail', noteId },
      });
    },
  },
  {
    id: 'notes.openToSide',
    title: 'Open to the side',
    icon: '\u{25EB}\u{FE0E}',
    category: 'Notes',
    slots: [NOTE_MENU_SLOT],
    run: (ctx, args) => {
      const noteId = (args as { noteId?: string } | undefined)?.noteId ?? targetId(ctx);
      if (!noteId) return;
      ctx.surfaces.open({
        surface: 'sidebar:right',
        key: `note:${noteId}`,
        resource: { component: 'NoteDetail', noteId },
      });
      const current = ctx.scena.layout.get().surfaces['sidebar:right'];
      ctx.scena.layout.setSurface('sidebar:right', { ...current, visible: true });
    },
  },
  {
    id: 'notes.copyId',
    title: 'Copy id',
    icon: '\u{2398}\u{FE0E}',
    category: 'Notes',
    slots: [NOTE_MENU_SLOT],
    run: (ctx) => {
      const noteId = targetId(ctx);
      if (!noteId) return;
      void navigator.clipboard?.writeText(noteId);
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

    // `ActivityBarItem` is scena's now. No `onClick`: the component runs
    // `sidebar.activate` itself when given a `section`.
    scena.surfaces.mount({
      surface: 'activitybar',
      key: 'notes:nav',
      resource: {
        component: 'ActivityBarItem',
        icon: ICON,
        label: 'Notes',
        section: 'notes',
        badge: { path: '$/summary/notes/total' },
        badgeLabel: 'notes',
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
