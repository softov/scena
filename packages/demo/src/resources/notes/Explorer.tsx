import { useScena, useStore } from '@softov/scena/react';
import { Listable } from '@softov/scena/ui';
import type { BindingPath } from '@softov/scena/types';
import { NOTE_MENU_SLOT, NOTE_MENU_TARGET } from './index.js';
import type { Note } from './data.js';

/**
 * The explorer, as `Listable` rather than as hand-rolled rows.
 *
 * The first version of this file was a `map` over buttons with its own
 * `useContextMenu` wiring — which worked, and was the wrong answer: `Listable`
 * already owns rows, selection, keyboard activation, the table/list breakpoint
 * and the right-click menu. Writing it by hand is how an app ends up with a
 * fourth copy of something the catalog ships.
 *
 * `contextMenuSlot` is the part worth pointing at. The menu's contents are not
 * a prop: anything registered into `NOTE_MENU_SLOT` appears, including commands
 * registered later by code this file has never heard of. An explorer that took
 * its actions as an array would throw that away.
 */
export default function NoteExplorer() {
  const scena = useScena();
  const notes = useStore<Note[]>('$/notes/all' as BindingPath) ?? [];
  const activeKind = useStore<string | null>('$/active/kind' as BindingPath);
  const activeId = useStore<string | null>('$/active/id' as BindingPath);

  if (notes.length === 0) {
    return <div className="demo-explorer__empty">Loading…</div>;
  }

  return (
    <Listable<Note>
      items={notes}
      getKey={(note) => note.id}
      columns={[
        { key: 'title', label: 'Note', render: (note) => note.title },
        { key: 'tag', label: 'Tag', render: (note) => note.tag, mode: 'table' },
      ]}
      selectedKey={activeKind === 'note' ? activeId : null}
      onSelect={(note) => void scena.commands.execute('notes.open', { noteId: note.id })}
      contextMenuSlot={NOTE_MENU_SLOT}
      // Which note was right-clicked, for the menu's commands to read. The
      // picker runs commands by id and carries no arguments of its own, so the
      // context IS the argument.
      contextFor={(note) => ({ [NOTE_MENU_TARGET]: note.id })}
    />
  );
}
