import { useScena, useStore } from '@softov/scena/react';
import type { BindingPath } from '@softov/scena/types';
import type { Note } from './data.js';

export default function NoteExplorer() {
  const scena = useScena();
  const notes = useStore<Note[]>('$/notes/all' as BindingPath) ?? [];
  const activeKind = useStore<string | null>('$/active/kind' as BindingPath);
  const activeId = useStore<string | null>('$/active/id' as BindingPath);

  if (notes.length === 0) {
    return <div className="demo-explorer__empty">Loading…</div>;
  }

  return (
    <div className="demo-explorer">
      {notes.map((note) => {
        const selected = activeKind === 'note' && activeId === note.id;
        return (
          <button
            key={note.id}
            type="button"
            className="demo-explorer__row"
            data-selected={selected}
            onClick={() => void scena.commands.execute('notes.open', { noteId: note.id })}
          >
            <span className="demo-explorer__title">{note.title}</span>
            <span className="demo-explorer__meta">{note.tag}</span>
          </button>
        );
      })}
    </div>
  );
}
