import type { DataProviderDefinition, ReactiveStore } from '@softov/scena/types';

export interface User {
  id: string;
  name: string;
  email: string;
  teamId: string;
}

const MOCK: User[] = [
  { id: 'u_1', name: 'Ada Lovelace',      email: 'ada@analytical.engine',    teamId: 'financial' },
  { id: 'u_2', name: 'Alan Turing',       email: 'alan@bletchley.park',      teamId: 'support'   },
  { id: 'u_3', name: 'Grace Hopper',      email: 'grace@cobol.dev',          teamId: 'support'   },
  { id: 'u_4', name: 'Edsger Dijkstra',   email: 'edsger@eindhoven.nl',      teamId: 'financial' },
];

export const usersDataProvider: DataProviderDefinition = {
  namespace: 'users',
  load: 'lazy',
  provider: {
    load(store) {
      setTimeout(() => {
        for (const u of MOCK) {
          store.set(`$/users/byId/${u.id}`, u);
        }
        store.set('$/users/all', MOCK);
        store.set('$/summary/users/total', MOCK.length);
      }, 80);
    },
  },
};

// Mutations that keep `$/users/byId/*`, `$/users/all`, and the summary
// count in sync. Without updating `all`, the sidebar list (which reads the
// array via useStore) wouldn't reflect deletions/additions.

export function removeUser(store: ReactiveStore, id: string): boolean {
  const existing = store.get<User>(`$/users/byId/${id}`);
  if (!existing) return false;
  store.delete(`$/users/byId/${id}`);
  const all = store.get<User[]>('$/users/all') ?? [];
  const next = all.filter((u) => u.id !== id);
  store.set('$/users/all', next);
  store.set('$/summary/users/total', next.length);
  return true;
}

export function addUser(store: ReactiveStore, user: User): boolean {
  if (store.get(`$/users/byId/${user.id}`)) return false;
  store.set(`$/users/byId/${user.id}`, user);
  const all = store.get<User[]>('$/users/all') ?? [];
  const next = [...all, user];
  store.set('$/users/all', next);
  store.set('$/summary/users/total', next.length);
  return true;
}
