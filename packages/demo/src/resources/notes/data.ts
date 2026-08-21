import type { DataProviderDefinition } from '@softov/scena/types';

export interface Note {
  id: string;
  title: string;
  body: string;
  tag: string;
}

const MOCK: Note[] = [
  {
    id: 'welcome',
    title: 'Welcome',
    body: 'This app resolves @softov/scena through its published exports rather than through src, so it fails the way a consumer would.',
    tag: 'meta',
  },
  {
    id: 'surfaces',
    title: 'Surfaces',
    body: 'A surface is a place things mount, not a component. The activity bar, both sidebars, main, and the status bar are all surfaces here.',
    tag: 'concepts',
  },
  {
    id: 'late-binding',
    title: 'Late binding',
    body: 'Nothing in a graph imports a component. `NoteExplorer` is a string until the registry resolves it at mount time.',
    tag: 'concepts',
  },
  {
    id: 'drawers',
    title: 'Narrow viewports',
    body: 'Make the window narrow. The sidebar keeps its width instead of lifting over main, because DefaultShell does not read the presentation policy.',
    tag: 'gaps',
  },
];

export const notesDataProvider: DataProviderDefinition = {
  namespace: 'notes',
  load: 'lazy',
  provider: {
    load(store) {
      // A tick of latency on purpose: an explorer that only looks right when
      // its data is already there is an explorer with no empty state.
      setTimeout(() => {
        for (const note of MOCK) store.set(`$/notes/byId/${note.id}`, note);
        store.set('$/notes/all', MOCK);
        store.set('$/summary/notes/total', MOCK.length);
      }, 60);
    },
  },
};
