import { useEffect, useMemo, useState, type ReactNode } from 'react';
import type { BindingPath, HostCtx, PickerAction } from '@softov/scena/types';
import { resolveLabel, translate } from '@softov/scena';
import { useScena } from '@softov/scena/react';
import { useChatPicker, ContextMenu } from '@softov/scena/ui';
import './picker-panel.css';

// Showcase for src/ui/menu — the picker family (ActionList, ContextMenu,
// useChatPicker). Exercises patterns 1–15 from doop-roadmap/ideas/scena/
// 15-command-view.md in one screen.
//
// Two ChatPanel instances at different dataContexts prove per-instance
// isolation. Right-click on a fake tab proves demo:context wiring. Right-click
// on a fake file proves resource:context + Open with….

// ── Sample agents / teams for the dynamic + async submenus ──────────────────

const MOCK_AGENTS = [
  { id: 'gpt-5.2',         name: 'GPT-5.2' },
  { id: 'claude-opus-4-7', name: 'Claude Opus 4.7' },
  { id: 'gemini-2.5',      name: 'Gemini 2.5' },
];

const MOCK_TEAMS = [
  { id: 't_eng',  name: 'Engineering' },
  { id: 't_res',  name: 'Research' },
  { id: 't_ops',  name: 'Operations' },
];

const MOCK_USERS = [
  { id: 'u_ada',     handle: 'ada',     name: 'Ada Lovelace' },
  { id: 'u_grace',   handle: 'grace',   name: 'Grace Hopper' },
  { id: 'u_alan',    handle: 'alan',    name: 'Alan Turing' },
  { id: 'u_edsger',  handle: 'edsger',  name: 'Edsger Dijkstra' },
  { id: 'u_barbara', handle: 'barbara', name: 'Barbara Liskov' },
];

const MOCK_FILES = [
  { name: 'README.md',  ext: 'md',   size: '2.1 KB' },
  { name: 'data.json',  ext: 'json', size: '512 B' },
  { name: 'notes.txt',  ext: 'txt',  size: '128 B' },
];

const MOCK_TABS = ['chat:alpha', 'chat:beta', 'editor:notes.txt'];

// ── Trivial file viewer components (registered with ComponentDefinition.opens) ─

function TextViewer({ path }: { path?: string }) {
  return (
    <div style={{ padding: 12, fontFamily: 'var(--oo-font-mono)' }}>
      <h3>Text view: {path}</h3>
      <pre>(plain text body)</pre>
    </div>
  );
}
function JsonViewer({ path }: { path?: string }) {
  return (
    <div style={{ padding: 12, fontFamily: 'var(--oo-font-mono)' }}>
      <h3>JSON view: {path}</h3>
      <pre>{`{\n  "demo": true\n}`}</pre>
    </div>
  );
}
function MarkdownPreview({ path }: { path?: string }) {
  return (
    <div style={{ padding: 12 }}>
      <h3>Markdown preview: {path}</h3>
      <p><strong>Rendered</strong> <em>markdown</em>.</p>
    </div>
  );
}

// ── Panel ───────────────────────────────────────────────────────────────────

export function PickerPanel(): ReactNode {
  const scena = useScena();

  // Register file viewer components + sample commands on mount.
  // Mounted ONCE for the demo — commands stay in the global registry while
  // this panel is open. Disposal removes them so the registry is clean.
  useEffect(() => {
    const disposables = [
      // ── Openers (components that declare what they render) ──────────────
      scena.components.register({
        component: 'demo.TextViewer',
        category: 'page',
        renderer: { kind: 'react', load: async () => ({ default: TextViewer as unknown }) },
        opens: { resourceKinds: ['file'], title: 'Text editor', icon: '📝', color: 'gray', priority: 10 },
      }),
      scena.components.register({
        component: 'demo.JsonViewer',
        category: 'page',
        renderer: { kind: 'react', load: async () => ({ default: JsonViewer as unknown }) },
        opens: { resourceKinds: ['file'], title: 'JSON tree', icon: '{}', color: 'amber', priority: 20, selector: '/resource/ext == "json"' },
      }),
      scena.components.register({
        component: 'demo.MarkdownPreview',
        category: 'page',
        renderer: { kind: 'react', load: async () => ({ default: MarkdownPreview as unknown }) },
        opens: { resourceKinds: ['file'], title: 'Markdown preview', icon: '👁', color: 'violet', priority: 20, selector: '/resource/ext == "md"' },
      }),

      // ── chat:input/ slot — pattern 1 (grouped sections) ────────────────
      scena.commands.register({
        id: 'demo.togglePlan',
        title: 'Plan mode',
        icon: '☰',
        color: 'blue',
        category: 'mode',
        shortcut: '/plan',
        slots: ['chat:input/'],
        active: (ctx) => Boolean(ctx.store.get(joinAbs(ctx.dataContext, '/plan'))),
        run: (ctx) => {
          const cur = Boolean(ctx.store.get(joinAbs(ctx.dataContext, '/plan')));
          ctx.store.set(joinAbs(ctx.dataContext, '/plan'), !cur);
          ctx.host?.keepOpen();
        },
      }),
      scena.commands.register({
        id: 'demo.toggleWorkspace',
        title: 'Workspace hint',
        icon: '◫',
        color: 'teal',
        category: 'mode',
        shortcut: '/workspace',
        slots: ['chat:input/'],
        active: (ctx) => Boolean(ctx.store.get(joinAbs(ctx.dataContext, '/workspace'))),
        run: (ctx) => {
          const cur = Boolean(ctx.store.get(joinAbs(ctx.dataContext, '/workspace')));
          ctx.store.set(joinAbs(ctx.dataContext, '/workspace'), !cur);
          ctx.host?.keepOpen();
        },
      }),

      // ── pattern 3 — pushList dynamic items ─────────────────────────────
      scena.commands.register({
        id: 'demo.pickAgent',
        title: 'Pick agent',
        icon: '🤖',
        color: 'violet',
        category: 'pick',
        shortcut: ['/agent', '/persona'],   // alias array — both trigger this command
        slots: ['chat:input/'],
        run: (ctx) => {
          ctx.host?.pushList({
            title: 'Agents',
            footerHints: true,
            provider: (): PickerAction[] => MOCK_AGENTS.map((a) => ({
              title: a.name,
              description: a.id,
              icon: '◇',
              active: ctx.store.get(joinAbs(ctx.dataContext, '/agent')) === a.id,
              onSelect: (host) => {
                ctx.store.set(joinAbs(ctx.dataContext, '/agent'), a.id);
                host.closeMenu();
              },
            })),
          });
        },
      }),

      // ── pattern 5 — info-list with side detail panel ───────────────────
      scena.commands.register({
        id: 'demo.pickRoute',
        title: 'Pick route',
        icon: '⤳',
        color: 'sky',
        category: 'pick',
        shortcut: '/route',
        slots: ['chat:input/'],
        run: (ctx) => {
          ctx.host?.pushList({
            title: 'Routing',
            layout: 'info-list',
            footerHints: true,
            items: [
              { title: 'Human',       icon: '👤', description: 'No automation', onSelect: (h) => commit(ctx, 'human', h) },
              { title: 'AI Agent',    icon: '🤖', description: 'Agent handles', onSelect: (h) => commit(ctx, 'agent', h) },
              { title: 'Flow',        icon: '⌥',  description: 'Deterministic', onSelect: (h) => commit(ctx, 'flow', h) },
            ],
            detail: (_host, focused) => {
              if (!focused || !('title' in focused)) return <em>Pick a row.</em>;
              return (
                <div>
                  <h4 style={{ margin: '0 0 6px' }}>{(focused as { title: string }).title}</h4>
                  <p style={{ fontSize: 11, color: 'var(--oo-color-muted)' }}>
                    {(focused as { description?: string }).description ?? ''}
                  </p>
                  <hr />
                  <small>Hover any row to see detail update.</small>
                </div>
              );
            },
          });

          function commit(ctxx: typeof ctx, mode: string, host: HostCtx) {
            ctxx.store.set(joinAbs(ctxx.dataContext, '/routingMode'), mode);
            host.closeMenu();
          }
        },
      }),

      // ── pattern 6 — header-list with a card above items ────────────────
      scena.commands.register({
        id: 'demo.pickGroup',
        title: 'Group actions',
        icon: '◧',
        color: 'indigo',
        category: 'pick',
        shortcut: '/group',
        slots: ['chat:input/'],
        run: (ctx) => {
          ctx.host?.pushList({
            title: 'Group',
            layout: 'header-list',
            footerHints: true,
            header: () => (
              <div style={{ fontSize: 11 }}>
                <strong>scena · dev</strong>
                <div style={{ color: 'var(--oo-color-muted)' }}>5 members · created 2 days ago</div>
              </div>
            ),
            items: [
              { title: 'Group info',   icon: 'ℹ', onSelect: (h) => h.closeMenu() },
              { title: 'Members',      icon: '◌', onSelect: (h) => h.closeMenu() },
              { title: 'Leave group',  icon: '⏏', group: 'danger', onSelect: (h) => h.closeMenu() },
            ],
          });
        },
      }),

      // ── pattern 4 — async items ────────────────────────────────────────
      scena.commands.register({
        id: 'demo.pickTeam',
        title: 'Pick team',
        icon: '◫',
        color: 'emerald',
        category: 'pick',
        shortcut: '/team',
        slots: ['chat:input/'],
        run: (ctx) => {
          ctx.host?.pushList({
            title: 'Teams (async)',
            footerHints: true,
            provider: async (): Promise<PickerAction[]> => {
              await new Promise((r) => setTimeout(r, 600));
              return MOCK_TEAMS.map((t) => ({
                title: t.name,
                description: t.id,
                icon: '◌',
                onSelect: (h) => {
                  ctx.store.set(joinAbs(ctx.dataContext, '/team'), t.id);
                  h.closeMenu();
                },
              }));
            },
          });
        },
      }),

      // ── pattern 15 — replace current list in place ─────────────────────
      scena.commands.register({
        id: 'demo.pickCategory',
        title: 'Pick by category',
        icon: '⧉',
        color: 'purple',
        category: 'pick',
        shortcut: '/cat',
        slots: ['chat:input/'],
        run: (ctx) => {
          ctx.host?.pushList({
            title: 'Categories',
            items: ['Engineering', 'Research', 'Operations'].map((cat) => ({
              title: cat,
              icon: '◇',
              onSelect: (host) => {
                host.replaceList({
                  title: cat,
                  provider: async (): Promise<PickerAction[]> => {
                    await new Promise((r) => setTimeout(r, 300));
                    return MOCK_USERS.filter(() => true).map((u) => ({
                      title: u.name,
                      description: u.handle,
                      onSelect: (h) => {
                        ctx.store.set(joinAbs(ctx.dataContext, '/owner'), u.id);
                        h.closeMenu();
                      },
                    }));
                  },
                });
              },
            })),
          });
        },
      }),

      // ── pattern 12 — typed-query-as-arg ─────────────────────────────────
      scena.commands.register({
        id: 'demo.sendRaw',
        title: 'Send raw text',
        icon: '✉',
        color: 'amber',
        category: 'action',
        shortcut: '/send',
        slots: ['chat:input/'],
        acceptsQuery: true,
        run: (ctx, args: unknown) => {
          const text = ((args as { query?: string })?.query ?? '').trim();
          ctx.store.set(joinAbs(ctx.dataContext, '/lastSent'), text);
          ctx.host?.closeMenu();
        },
      }),

      // ── pattern 10 — confirm step ───────────────────────────────────────
      scena.commands.register({
        id: 'demo.confirmDelete',
        title: 'Delete conversation',
        icon: '🗑',
        color: 'red',
        category: 'action',
        shortcut: '/delete',
        slots: ['chat:input/'],
        run: (ctx) => {
          ctx.host?.pushList({
            title: 'Confirm',
            items: [
              {
                title: 'Yes, delete',
                icon: '✓',
                group: 'danger',
                onSelect: (h) => {
                  ctx.store.set(joinAbs(ctx.dataContext, '/deleted'), true);
                  h.closeMenu();
                },
              },
              {
                title: 'Cancel',
                icon: '✕',
                onSelect: (h) => h.back(),
              },
            ],
          });
        },
      }),

      // ── pattern 9 — inline text input inside a submenu ──────────────────
      scena.commands.register({
        id: 'demo.addMember',
        title: 'Add member by handle',
        icon: '+',
        color: 'green',
        category: 'action',
        shortcut: '/add',
        slots: ['chat:input/'],
        run: (ctx) => {
          let typed = '';
          ctx.host?.pushList({
            title: 'Add member',
            customHeader: () => (
              <input
                type="text"
                autoFocus
                placeholder="Enter handle…"
                style={{ width: '100%', padding: '4px 6px', font: 'inherit' }}
                onChange={(e) => { typed = e.currentTarget.value; }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && typed.trim()) {
                    ctx.store.set(joinAbs(ctx.dataContext, '/lastAdded'), typed.trim());
                    ctx.host?.closeMenu();
                  }
                }}
              />
            ),
            items: MOCK_USERS.map((u) => ({
              title: u.name,
              description: '@' + u.handle,
              onSelect: (h) => {
                ctx.store.set(joinAbs(ctx.dataContext, '/lastAdded'), u.handle);
                h.closeMenu();
              },
            })),
          });
        },
      }),

      // ── settings.open — proves slash + button converge on one command ──
      scena.commands.register({
        id: 'demo.openSettings',
        title: 'Settings',
        icon: '⚙',
        color: 'slate',
        category: 'action',
        shortcut: '/settings',
        slots: ['chat:input/', 'demo:context'],
        run: (ctx) => {
          ctx.scena.surfaces.open({
            surface: 'main',
            key: 'settings',
            resource: { component: 'SettingsPanel' },
          });
          ctx.host?.closeMenu();
        },
      }),

      // ── demo:context slot — right-click on a tab ────────────────────────
      scena.commands.register({
        id: 'demo.tab.close',
        title: 'Close tab',
        icon: '✕',
        color: 'gray',
        slots: ['demo:context'],
        run: (ctx) => {
          const key = ctx.store.get(joinAbs(ctx.dataContext, '/tab/key'));
          ctx.store.set(joinAbs(ctx.dataContext, '/lastClosed'), String(key));
          ctx.host?.closeMenu();
        },
      }),
      scena.commands.register({
        id: 'demo.tab.pin',
        title: 'Pin tab',
        icon: '📌',
        color: 'amber',
        slots: ['demo:context'],
        run: (ctx) => {
          ctx.store.set(joinAbs(ctx.dataContext, '/pinned'), true);
          ctx.host?.closeMenu();
        },
      }),

      // ── resource:context slot — right-click on a file ──────────────────
      scena.commands.register({
        id: 'demo.file.openWith',
        title: 'Open with…',
        icon: '↗',
        color: 'blue',
        slots: ['resource:context'],
        when: '/resource/kind == "file"' as never,
        run: (ctx) => {
          const ext = String(ctx.store.get(joinAbs(ctx.dataContext, '/resource/ext')) ?? '');
          const path = String(ctx.store.get(joinAbs(ctx.dataContext, '/resource/id')) ?? '');
          const openers = ctx.scena.components.findOpeners('file').filter(
            (def) => {
              const sel = def.opens?.selector;
              if (!sel) return true;
              // Inline lightweight selector eval against just-injected /resource/* paths.
              const m = String(sel).match(/\/resource\/ext\s*==\s*"([^"]+)"/);
              return m ? m[1] === ext : true;
            },
          );
          ctx.host?.pushList({
            title: 'Open with',
            items: openers.map((def): PickerAction => ({
              title: resolveLabel(def.opens?.title ?? def.component, {
                get: (p) => ctx.scena.store.get(p as BindingPath),
                translate,
              }),
              icon: def.opens?.icon,
              color: def.opens?.color,
              onSelect: (host) => {
                ctx.scena.surfaces.open({
                  surface: def.opens?.preferredSurface ?? 'main',
                  key: `view:${def.component}:${path}`,
                  resource: { component: def.component, path },
                });
                host.closeMenu();
              },
            })),
          });
        },
      }),
    ];

    return () => {
      for (const d of disposables) d.dispose();
    };
  }, [scena]);

  return (
    <div className="picker-demo">
      <header>
        <h2>Picker family demo</h2>
        <p>
          Two chat panels with their own input + picker stack. Same commands,
          independent state. Right-click the fake tab strip or file rows to
          exercise context menus + "Open with…".
        </p>
      </header>

      <div className="picker-demo__row">
        <ChatPanel id="a" />
        <ChatPanel id="b" />
      </div>

      <section>
        <h3>demo:context (right-click on a tab)</h3>
        <TabStripDemo />
      </section>

      <section>
        <h3>resource:context + Open with… (right-click on a file)</h3>
        <FileListDemo />
      </section>
    </div>
  );
}

// ── ChatPanel ───────────────────────────────────────────────────────────────

function ChatPanel({ id }: { id: 'a' | 'b' }) {
  const dataContext = `$/demo/chats/${id}` as BindingPath;
  const [input, setInput] = useState('');
  const [caret, setCaret] = useState(0);

  const mentionProvider = useMemo(
    () =>
      (host: HostCtx): PickerAction[] => {
        const q = host.query.toLowerCase();
        return MOCK_USERS
          .filter((u) => !q || u.name.toLowerCase().includes(q) || u.handle.includes(q))
          .map((u) => ({
            title: u.name,
            description: '@' + u.handle,
            onSelect: (h) => h.insertAtCursor('@' + u.handle + ' '),
          }));
      },
    [],
  );

  const picker = useChatPicker({
    input,
    setInput,
    caretIndex: caret,
    panelDataContext: dataContext,
    mentionProvider,
  });

  const scena = useScena();
  const agent = useStoreVal(`${dataContext}/agent` as BindingPath);
  const route = useStoreVal(`${dataContext}/routingMode` as BindingPath);
  const team = useStoreVal(`${dataContext}/team` as BindingPath);
  const plan = useStoreVal(`${dataContext}/plan` as BindingPath);
  const workspace = useStoreVal(`${dataContext}/workspace` as BindingPath);
  const lastSent = useStoreVal(`${dataContext}/lastSent` as BindingPath);
  const lastAdded = useStoreVal(`${dataContext}/lastAdded` as BindingPath);

  return (
    <div className="picker-demo__chat">
      <h3>Chat {id.toUpperCase()} <small>dataContext: {dataContext}</small></h3>

      <div className="picker-demo__buttons">
        <button onClick={() => picker.openCommand('demo.pickAgent')}>🤖 Agent</button>
        <button onClick={() => picker.openCommand('demo.pickRoute')}>⤳ Route</button>
        <button onClick={() => picker.openCommand('demo.pickTeam')}>◫ Team</button>
        <button onClick={() => picker.openCommand('demo.togglePlan')}>☰ Plan</button>
      </div>

      <textarea
        value={input}
        onChange={(e) => { setInput(e.target.value); setCaret(e.target.selectionStart); }}
        onKeyUp={(e) => setCaret(e.currentTarget.selectionStart)}
        onClick={(e) => setCaret(e.currentTarget.selectionStart)}
        onKeyDown={picker.handleMenuKeyDown}
        placeholder="Type / or @ — try /agent, /route, /team, /cat, /plan, /add, /send hello, /delete, @ada"
        rows={3}
      />

      {picker.pickerNode ? <div className="picker-demo__picker">{picker.pickerNode}</div> : null}

      <dl className="picker-demo__state">
        <dt>Agent</dt>     <dd>{String(agent ?? '—')}</dd>
        <dt>Route</dt>     <dd>{String(route ?? '—')}</dd>
        <dt>Team</dt>      <dd>{String(team ?? '—')}</dd>
        <dt>Plan</dt>      <dd>{plan ? 'on' : 'off'}</dd>
        <dt>Workspace</dt> <dd>{workspace ? 'on' : 'off'}</dd>
        <dt>Last sent</dt> <dd>{String(lastSent ?? '—')}</dd>
        <dt>Last added</dt><dd>{String(lastAdded ?? '—')}</dd>
      </dl>

      {/* keep `scena` referenced so the import isn't flagged unused when the demo trims */}
      <small style={{ display: 'none' }}>{scena ? '' : ''}</small>
    </div>
  );
}

// ── TabStrip with right-click → demo:context ─────────────────────────────────

function TabStripDemo() {
  const [menu, setMenu] = useState<null | { x: number; y: number; key: string; index: number }>(null);
  const lastClosed = useStoreVal('$/demo/tabstrip/lastClosed' as BindingPath);

  function openMenu(e: React.MouseEvent, key: string, index: number) {
    e.preventDefault();
    setMenu({ x: e.clientX, y: e.clientY, key, index });
  }

  return (
    <>
      <div className="picker-demo__tabs">
        {MOCK_TABS.map((key, i) => (
          <div
            key={key}
            className="picker-demo__tab"
            onContextMenu={(e) => openMenu(e, key, i)}
          >
            {key}
          </div>
        ))}
      </div>
      <small>Last closed: <code>{String(lastClosed ?? '—')}</code></small>
      {menu ? (
        <ContextMenu
          x={menu.x}
          y={menu.y}
          onClose={() => setMenu(null)}
          spec={{ query: { slot: 'demo:context' }, footerHints: true }}
          context={{ '/tab/key': menu.key, '/tab/index': menu.index }}
          dataContext={'$/demo/tabstrip' as BindingPath}
        />
      ) : null}
    </>
  );
}

// ── File list with right-click → resource:context + Open with… ──────────────

function FileListDemo() {
  const [menu, setMenu] = useState<null | { x: number; y: number; file: typeof MOCK_FILES[number] }>(null);

  function openMenu(e: React.MouseEvent, file: typeof MOCK_FILES[number]) {
    e.preventDefault();
    setMenu({ x: e.clientX, y: e.clientY, file });
  }

  return (
    <>
      <div className="picker-demo__files">
        {MOCK_FILES.map((f) => (
          <div key={f.name} className="picker-demo__file" onContextMenu={(e) => openMenu(e, f)}>
            <span>{f.name}</span>
            <small>{f.size}</small>
          </div>
        ))}
      </div>
      {menu ? (
        <ContextMenu
          x={menu.x}
          y={menu.y}
          onClose={() => setMenu(null)}
          spec={{ query: { slot: 'resource:context' }, footerHints: true }}
          context={{
            '/resource/kind': 'file',
            '/resource/id': menu.file.name,
            '/resource/ext': menu.file.ext,
          }}
          dataContext={'$/demo/files' as BindingPath}
        />
      ) : null}
    </>
  );
}

// ── Tiny utility hooks (avoid pulling more dev deps than the demo needs) ────

function useStoreVal(path: BindingPath): unknown {
  const scena = useScena();
  const [value, setValue] = useState<unknown>(() => scena.store.get(path));
  useEffect(() => {
    setValue(scena.store.get(path));
    const sub = scena.store.subscribe(path, () => setValue(scena.store.get(path)));
    return () => sub.dispose();
  }, [scena, path]);
  return value;
}

function joinAbs(root: BindingPath | undefined, rel: string): BindingPath {
  if (rel.startsWith('$/')) return rel as BindingPath;
  if (!root) return (rel.startsWith('/') ? `$${rel}` : `$/${rel}`) as BindingPath;
  const base = root.endsWith('/') ? root.slice(0, -1) : root;
  const tail = rel.startsWith('/') ? rel : `/${rel}`;
  return `${base}${tail}` as BindingPath;
}
