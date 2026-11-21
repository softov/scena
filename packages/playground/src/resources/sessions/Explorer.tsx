import { startOpenDrag, useScena, useStore } from '@softov/scena/react';
import { Listable, StatusDot, type ListableColumn } from '@softov/scena/ui';
import { readSessionOpens, SESSION_OPENS_PATH, setSessionOpens, type Session, type SessionPlace } from './data.js';
import { sessionKey } from './commands.js';

const TONE: Record<Session['status'], 'success' | 'warning' | 'default'> = {
  done: 'success',
  running: 'warning',
  idle: 'default',
};

const COLUMNS: ListableColumn<Session>[] = [
  {
    key: 'status',
    label: '',
    width: '24px',
    render: (s) => <StatusDot tone={TONE[s.status]} />,
  },
  {
    key: 'title',
    label: 'Session',
    sortable: true,
    width: 'minmax(140px, 1fr)',
    style: { flex: 1 },
    render: (s) => (
      <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <span>{s.title}</span>
        <span style={{ color: 'var(--oo-color-muted)', fontSize: 11 }}>{s.agent} · {s.status}</span>
      </div>
    ),
  },
];

// The session list. A click opens a session where "Sessions open in" says;
// the right-click menu opens it in a place of its own choosing. An open
// session is focused where it is, either way.
export default function SessionExplorer() {
  const scena = useScena();
  const sessions = useStore<Session[]>('$/sessions/all') ?? [];
  useStore<string>(SESSION_OPENS_PATH);
  const opens = readSessionOpens(scena.store);
  const activeId = useStore<string | null>('$/active/id');
  const activeKind = useStore<string | null>('$/active/kind');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      <label style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', fontSize: 12 }}>
        <span style={{ color: 'var(--oo-color-muted)' }}>Sessions open in</span>
        <select
          value={opens}
          onChange={(e) => setSessionOpens(scena.store, e.target.value as SessionPlace)}
          style={{ flex: 1 }}
        >
          <option value="main">Main area</option>
          <option value="right">Right sidebar</option>
        </select>
      </label>
      <div style={{ flex: 1, minHeight: 0 }}>
        <Listable<Session>
          title="Sessions"
          items={sessions}
          columns={COLUMNS}
          getKey={(s) => s.id}
          selectedKey={activeKind === 'session' ? activeId : null}
          onSelect={(s) => scena.commands.execute('sessions.open', { sessionId: s.id })}
          // A row drags onto any surface: the session opens where it falls,
          // or its tab moves there when it is open elsewhere.
          onRowDragStart={(e, s) =>
            startOpenDrag(e.dataTransfer, {
              key: sessionKey(s.id),
              resource: { component: 'SessionView', sessionId: s.id },
              props: { title: s.title },
            })
          }
          contextMenuSlot="resource:context"
          contextFor={(s) => ({ '$/resource/kind': 'session', '$/resource/id': s.id, '$/resource/key': sessionKey(s.id) })}
          emptyState="Loading…"
        />
      </div>
    </div>
  );
}
