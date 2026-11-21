import type { BindingPath, DataProviderDefinition, ReactiveStore } from '@softov/scena/types';

// Fake agent sessions, so the playground can open a session view in several
// places: main, the right sidebar, a window. Shaped like an agent host's
// session (a title, an agent, a status, a chat), so a chat view or a
// composer built on scena later has something to draw.

export type SessionStatus = 'idle' | 'running' | 'done';

// A tab or a row dropped on the composer: what the message refers to.
export interface ChatReference {
  key: string;
  title: string;
}

export interface ChatMessage {
  role: 'user' | 'agent';
  text: string;
  refs?: ChatReference[];
}

export interface Session {
  id: string;
  title: string;
  agent: string;
  status: SessionStatus;
  messages: ChatMessage[];
}

const MOCK: Session[] = [
  {
    id: 's_1',
    title: 'Refine the settings page',
    agent: 'claude',
    status: 'done',
    messages: [
      { role: 'user', text: 'Group the settings by section, and keep the search on top.' },
      { role: 'agent', text: 'Done. The form now has **four sections**, and the search filters across all of them.' },
    ],
  },
  {
    id: 's_2',
    title: 'Fix the flaky upload test',
    agent: 'codex',
    status: 'running',
    messages: [{ role: 'user', text: 'The upload test fails one run in ten. Find out why.' }],
  },
  {
    id: 's_3',
    title: 'Write the release notes',
    agent: 'claude',
    status: 'idle',
    messages: [],
  },
];

export const sessionsDataProvider: DataProviderDefinition = {
  namespace: 'sessions',
  load: 'lazy',
  provider: {
    load(store) {
      for (const s of MOCK) store.set(`$/sessions/byId/${s.id}` as BindingPath, s);
      store.set('$/sessions/all' as BindingPath, MOCK);
    },
  },
};

export const sessionPath = (id: string) => `$/sessions/byId/${id}` as BindingPath;

// Appends a message, and keeps `$/sessions/all` in step for the list.
export function addMessage(store: ReactiveStore, id: string, message: ChatMessage, status?: SessionStatus): void {
  const session = store.get<Session>(sessionPath(id));
  if (!session) return;
  const next: Session = { ...session, messages: [...session.messages, message], status: status ?? session.status };
  store.set(sessionPath(id), next);
  const all = store.get<Session[]>('$/sessions/all' as BindingPath) ?? [];
  store.set('$/sessions/all' as BindingPath, all.map((s) => (s.id === id ? next : s)));
}

// Where a session opens the first time: the main area or the right sidebar,
// kept per browser, as ahpw's `ui.sessionOpens` is.
export type SessionPlace = 'main' | 'right';
export const SESSION_OPENS_PATH = '$/sessions/opens' as BindingPath;
const OPENS_KEY = 'scena-dev.sessionOpens';

export function readSessionOpens(store: ReactiveStore): SessionPlace {
  const now = store.get<string>(SESSION_OPENS_PATH) ?? safeGet(OPENS_KEY);
  return now === 'right' ? 'right' : 'main';
}

export function setSessionOpens(store: ReactiveStore, place: SessionPlace): void {
  try {
    localStorage.setItem(OPENS_KEY, place);
  } catch {
    // The store still holds it for this visit.
  }
  store.set(SESSION_OPENS_PATH, place);
}

function safeGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
