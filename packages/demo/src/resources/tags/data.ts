import type { DataProviderDefinition } from '@softov/scena/types';

export interface Tag {
  id: string;
  label: string;
  count: number;
}

const MOCK: Tag[] = [
  { id: 'meta', label: 'meta', count: 1 },
  { id: 'concepts', label: 'concepts', count: 2 },
  { id: 'gaps', label: 'gaps', count: 1 },
];

export const tagsDataProvider: DataProviderDefinition = {
  namespace: 'tags',
  load: 'lazy',
  provider: {
    load(store) {
      setTimeout(() => {
        store.set('$/tags/all', MOCK);
        store.set('$/summary/tags/total', MOCK.length);
      }, 60);
    },
  },
};
