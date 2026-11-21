import { useEffect, useRef, useState } from 'react';
import { useDropArea, useScena, useStore } from '@softov/scena/react';
import { Button, Markdown, StatusDot } from '@softov/scena/ui';
import type { SurfaceName } from '@softov/scena/types';
import { addMessage, sessionPath, type ChatReference, type Session } from './data.js';
import { sessionKey } from './commands.js';

// A session's page: its header, its chat, and a composer. The agent is
// fake: it answers a message after a moment. The header says which surface
// the tab is on, so moving it (a drag, a window, a reopen) shows at once.

function useSurfaceOf(key: string): SurfaceName | undefined {
  const scena = useScena();
  const [surface, setSurface] = useState(() => find());
  function find(): SurfaceName | undefined {
    return scena.surfaces.listSurfaces().find((s) => scena.surfaces.listAt(s).some((m) => m.key === key));
  }
  useEffect(() => {
    const update = () => setSurface(find());
    const subs = [scena.events.on('scena:mount:opened', update), scena.events.on('scena:mount:closed', update)];
    update();
    return () => subs.forEach((s) => s.dispose());
    // `find` reads scena and key, both deps already.
  }, [scena, key]); // eslint-disable-line react-hooks/exhaustive-deps
  return surface;
}

const TONE: Record<Session['status'], 'success' | 'warning' | 'default'> = { done: 'success', running: 'warning', idle: 'default' };

export default function SessionView({ sessionId }: { sessionId: string }) {
  const scena = useScena();
  const session = useStore<Session>(sessionPath(sessionId));
  const surface = useSurfaceOf(sessionKey(sessionId));
  const [draft, setDraft] = useState('');
  // The composer is a drop area: a session, a user or a file, as a tab or a
  // row, becomes a reference in the message. The tab stays where it was.
  const [refs, setRefs] = useState<ChatReference[]>([]);
  const ownKey = sessionKey(sessionId);
  const composer = useDropArea({
    accepts: (thing) => thing.key !== ownKey,
    onDrop: (thing) => {
      const title = typeof thing.title === 'string' ? thing.title : thing.key;
      setRefs((cur) => (cur.some((r) => r.key === thing.key) ? cur : [...cur, { key: thing.key, title }]));
    },
  });
  const bottom = useRef<HTMLDivElement>(null);
  const messages = session?.messages ?? [];

  useEffect(() => {
    bottom.current?.scrollIntoView?.({ block: 'end' });
  }, [messages.length]);

  if (!session) {
    return <div style={{ padding: 16, color: 'var(--oo-color-muted)' }}>Loading session {sessionId}…</div>;
  }

  function send(): void {
    const text = draft.trim();
    if (!text && refs.length === 0) return;
    setDraft('');
    const sent = refs;
    setRefs([]);
    addMessage(scena.store, sessionId, { role: 'user', text, ...(sent.length ? { refs: sent } : {}) }, 'running');
    setTimeout(() => {
      addMessage(scena.store, sessionId, { role: 'agent', text: `Noted: *${text}*. This agent is a simulation.` }, 'done');
    }, 700);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      <header style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderBottom: '1px solid var(--oo-color-border)' }}>
        <StatusDot tone={TONE[session.status]} />
        <strong style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{session.title}</strong>
        <span style={{ color: 'var(--oo-color-muted)', fontSize: 12 }}>{session.agent}</span>
        <code data-testid="session-surface" style={{ fontSize: 11, padding: '1px 6px', borderRadius: 4, background: 'var(--oo-color-surface-2, rgba(127,127,127,0.15))' }}>
          {surface ?? '…'}
        </code>
      </header>

      <div style={{ flex: 1, minHeight: 0, overflow: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {messages.length === 0 ? (
          <p style={{ color: 'var(--oo-color-muted)', margin: 0 }}>No messages yet. Write one below.</p>
        ) : (
          messages.map((m, i) => (
            <div
              key={i}
              style={{
                alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                maxWidth: '85%',
                padding: '8px 12px',
                borderRadius: 8,
                background: m.role === 'user' ? 'var(--oo-color-accent-soft, rgba(80,120,255,0.15))' : 'var(--oo-color-surface-2, rgba(127,127,127,0.12))',
              }}
            >
              {m.refs?.length ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: m.text ? 6 : 0 }}>
                  {m.refs.map((r) => (
                    <span key={r.key} title={r.key} style={{ fontSize: 11, padding: '1px 6px', borderRadius: 10, border: '1px solid var(--oo-color-border)' }}>
                      @{r.title}
                    </span>
                  ))}
                </div>
              ) : null}
              {m.text ? <Markdown text={m.text} /> : null}
            </div>
          ))
        )}
        <div ref={bottom} />
      </div>

      <footer
        {...composer.props}
        data-drop-over={composer.over || undefined}
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
          padding: 10,
          borderTop: '1px solid var(--oo-color-border)',
          outline: composer.over ? '2px dashed var(--oo-color-accent)' : 'none',
          outlineOffset: -4,
        }}
      >
        {refs.length > 0 ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {refs.map((r) => (
              <span key={r.key} title={r.key} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, padding: '1px 4px 1px 8px', borderRadius: 10, border: '1px solid var(--oo-color-border)' }}>
                @{r.title}
                <button
                  type="button"
                  aria-label={`Remove ${r.title}`}
                  onClick={() => setRefs((cur) => cur.filter((x) => x.key !== r.key))}
                  style={{ border: 'none', background: 'none', cursor: 'pointer', padding: '0 2px', color: 'inherit' }}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        ) : null}
        <div style={{ display: 'flex', gap: 8 }}>
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          placeholder="Message the agent, or drop a tab or a row here"
          rows={2}
          style={{ flex: 1, resize: 'none', font: 'inherit' }}
        />
        <Button label="Send" variant="primary" onClick={send} disabled={draft.trim() === '' && refs.length === 0} />
        </div>
      </footer>
    </div>
  );
}
