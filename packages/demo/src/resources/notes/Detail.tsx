import { useStore } from '@softov/scena/react';
import type { BindingPath } from '@softov/scena/types';
import { Card, Text, Badge } from '@softov/scena/ui';
import type { Note } from './data.js';

// Uses the shipped catalog rather than hand-rolled markup, on purpose: it is
// what makes this app exercise `@softov/scena/ui` resolving out of dist,
// co-located CSS and all.
export default function NoteDetail({ noteId }: { noteId?: string }) {
  const note = useStore<Note>(`$/notes/byId/${noteId}` as BindingPath);

  if (!note) {
    return (
      <div className="demo-detail">
        <Text text="No note selected." muted />
      </div>
    );
  }

  return (
    <div className="demo-detail">
      <Card title={note.title} subtitle={note.id}>
        <Badge label={note.tag} tone="info" />
        <Text text={note.body} />
      </Card>
    </div>
  );
}
