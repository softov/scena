import type { DataProviderDefinition } from '@softov/scena/types';

export interface Team {
  id: string;
  name: string;
  description: string;
}

const MOCK: Team[] = [
  {
    id: 'financial',
    name: 'Financial',
    description: 'Accounting, treasury, and audit.',
  },
  {
    id: 'support',
    name: 'Support',
    description: 'Front-line customer support and escalations.',
  },
];

export const teamsDataProvider: DataProviderDefinition = {
  namespace: 'teams',
  load: 'lazy',
  provider: {
    load(store) {
      setTimeout(() => {
        for (const t of MOCK) {
          store.set(`$/teams/byId/${t.id}`, t);
        }
        store.set('$/teams/all', MOCK);
        store.set('$/summary/teams/total', MOCK.length);
      }, 50);
    },
  },
};
