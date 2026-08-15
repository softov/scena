import { type ReactNode, useEffect, useMemo, useState } from 'react';
import { useScena } from '@softov/scena/react';
import { Tree, type TreeNode } from '@softov/scena/ui';
import './file-explorer-panel.css';

// Demo file explorer. Mock file system, drag-drop logging, copy/paste
// events, right-click "Open with…" via the registered openers catalog.
// Files open in `main` as a tab using a viewer component selected by the
// opener registry (TextViewer for .txt, JsonViewer for .json, MarkdownViewer
// for .md). This exercises:
//   • Tree (drag/drop, copy/paste, ctx menu, kbd nav)
//   • ContextMenu + commands.list({slot: 'file:context'})
//   • ComponentDefinition.opens / findOpeners
//   • Per-file mount via scena.surfaces.open

interface FileEntry {
  path: string;
  ext: string;
  body: string;
}

interface FolderEntry {
  path: string;
  // No body; children live in MOCK_FS by prefix match. `ext`/`body` as
  // optional-never keep FolderEntry disjoint from FileEntry so `!isFolder(n)`
  // narrows to FileEntry instead of `never`.
  ext?: never;
  body?: never;
}

type FsNode = FileEntry | FolderEntry;

const MOCK_FS: Record<string, FsNode> = {
  '/': { path: '/' },
  '/src': { path: '/src' },
  '/src/app.json': {
    path: '/src/app.json',
    ext: 'json',
    body: JSON.stringify({ name: 'scena-demo', version: '0.0.1', main: 'index.js' }, null, 2),
  },
  '/src/README.md': {
    path: '/src/README.md',
    ext: 'md',
    body:
      '# Scena demo\n\n' +
      'This is a mock file system used to exercise the **Tree** primitive ' +
      'and the **opener registry**.\n\n' +
      '- Right-click a file → context menu\n' +
      '- "Open with…" lists every registered viewer for this resource kind\n' +
      '- Drag files to log the event\n',
  },
  '/src/notes.txt': {
    path: '/src/notes.txt',
    ext: 'txt',
    body: 'Plain text. Nothing special.\nJust here to prove the viewer registry works.\n',
  },
  '/docs': { path: '/docs' },
  '/docs/spec.md': {
    path: '/docs/spec.md',
    ext: 'md',
    body: '# Spec\n\nMore markdown to test multiple Markdown viewers being registered.\n',
  },
  '/docs/api.md': {
    path: '/docs/api.md',
    ext: 'md',
    body: '# API\n\n## Tree\n\nProps documented in `Tree.tsx`.\n',
  },
  '/data.json': {
    path: '/data.json',
    ext: 'json',
    body: JSON.stringify({ users: ['ada', 'grace', 'alan'] }, null, 2),
  },
};

function isFolder(n: FsNode): n is FolderEntry {
  return !('body' in n);
}

function buildTree(): TreeNode<FsNode>[] {
  // Build a hierarchy from the flat MOCK_FS by path.
  const all = Object.values(MOCK_FS).filter((n) => n.path !== '/');
  const byPath = new Map(all.map((n) => [n.path, n] as const));
  const childrenOf = new Map<string, TreeNode<FsNode>[]>();

  for (const n of all) {
    const parts = n.path.split('/').filter(Boolean);
    const parent = parts.length <= 1 ? '/' : '/' + parts.slice(0, -1).join('/');
    const childArr = childrenOf.get(parent) ?? [];
    childrenOf.set(parent, childArr);
  }

  function pushNode(node: FsNode, parentPath: string): void {
    const treeNode: TreeNode<FsNode> = isFolder(node)
      ? {
          key: node.path,
          label: node.path.split('/').filter(Boolean).pop() ?? node.path,
          icon: '\u{1F4C1}︎', // folder
          color: 'amber',
          children: [],
          draggable: false,
          data: node,
        }
      : {
          key: node.path,
          label: node.path.split('/').filter(Boolean).pop() ?? node.path,
          icon: iconForExt(node.ext),
          color: colorForExt(node.ext),
          draggable: true,
          data: node,
        };
    if (treeNode.children !== undefined) {
      // Recurse: populate children from MOCK_FS where parent prefix matches.
      const direct = directChildrenOf(node.path);
      treeNode.children = direct.map((c) => buildChildTree(c, node.path));
    }
    const arr = childrenOf.get(parentPath) ?? [];
    arr.push(treeNode);
    childrenOf.set(parentPath, arr);
  }

  function buildChildTree(n: FsNode, _parentPath: string): TreeNode<FsNode> {
    if (isFolder(n)) {
      return {
        key: n.path,
        label: n.path.split('/').filter(Boolean).pop() ?? n.path,
        icon: '\u{1F4C1}︎',
        color: 'amber',
        children: directChildrenOf(n.path).map((c) => buildChildTree(c, n.path)),
        data: n,
      };
    }
    return {
      key: n.path,
      label: n.path.split('/').filter(Boolean).pop() ?? n.path,
      icon: iconForExt(n.ext),
      color: colorForExt(n.ext),
      draggable: true,
      data: n,
    };
  }

  function directChildrenOf(parentPath: string): FsNode[] {
    const out: FsNode[] = [];
    for (const n of byPath.values()) {
      const parts = n.path.split('/').filter(Boolean);
      const expected =
        parentPath === '/' ? 1 : parentPath.split('/').filter(Boolean).length + 1;
      if (parts.length !== expected) continue;
      const parent =
        parts.length <= 1 ? '/' : '/' + parts.slice(0, -1).join('/');
      if (parent !== parentPath) continue;
      out.push(n);
    }
    out.sort((a, b) => {
      const aIsDir = isFolder(a) ? 0 : 1;
      const bIsDir = isFolder(b) ? 0 : 1;
      if (aIsDir !== bIsDir) return aIsDir - bIsDir;
      return a.path.localeCompare(b.path);
    });
    return out;
  }

  // Build top-level.
  const top: TreeNode<FsNode>[] = [];
  for (const n of directChildrenOf('/')) {
    pushNode(n, '/');
  }
  for (const n of (childrenOf.get('/') ?? [])) top.push(n);
  return top;
}

function iconForExt(ext: string): string {
  if (ext === 'md') return '\u{1F4DD}︎';      // memo
  if (ext === 'json') return '{' + '}';   // {}
  if (ext === 'txt') return '\u{1F4C4}︎';      // page-facing-up
  return '\u{1F4C4}︎';
}
function colorForExt(ext: string): string {
  if (ext === 'md') return 'violet';
  if (ext === 'json') return 'amber';
  if (ext === 'txt') return 'sky';
  return 'gray';
}

// ── Viewers ────────────────────────────────────────────────────────────────

function TextViewer({ path }: { path?: string }) {
  if (!path) return <div style={{ padding: 12 }}>No path</div>;
  const entry = MOCK_FS[path];
  if (!entry || isFolder(entry)) return <div style={{ padding: 12 }}>Not a file</div>;
  return (
    <div style={{ padding: 12 }}>
      <h3 style={{ margin: '0 0 8px' }}>{path}</h3>
      <pre
        style={{
          margin: 0,
          padding: 12,
          background: 'var(--oo-color-canvas)',
          border: '1px solid var(--oo-color-border)',
          borderRadius: 4,
          fontFamily: 'var(--oo-font-mono)',
          fontSize: 12,
          whiteSpace: 'pre-wrap',
          overflow: 'auto',
        }}
      >
        {entry.body}
      </pre>
    </div>
  );
}

function JsonViewer({ path }: { path?: string }) {
  if (!path) return <div style={{ padding: 12 }}>No path</div>;
  const entry = MOCK_FS[path];
  if (!entry || isFolder(entry)) return <div style={{ padding: 12 }}>Not a file</div>;
  let parsed: unknown;
  try { parsed = JSON.parse(entry.body); } catch { parsed = entry.body; }
  return (
    <div style={{ padding: 12 }}>
      <h3 style={{ margin: '0 0 8px' }}>{path}</h3>
      <pre
        style={{
          margin: 0,
          padding: 12,
          background: 'var(--oo-color-canvas)',
          border: '1px solid var(--oo-color-border)',
          borderRadius: 4,
          fontFamily: 'var(--oo-font-mono)',
          fontSize: 12,
          overflow: 'auto',
        }}
      >
        {JSON.stringify(parsed, null, 2)}
      </pre>
    </div>
  );
}

function MarkdownViewer({ path }: { path?: string }) {
  if (!path) return <div style={{ padding: 12 }}>No path</div>;
  const entry = MOCK_FS[path];
  if (!entry || isFolder(entry)) return <div style={{ padding: 12 }}>Not a file</div>;
  // Tiny inline markdown renderer (headings, bold, italics, list items).
  const lines = entry.body.split(/\r?\n/);
  const out: ReactNode[] = [];
  let listBuf: string[] = [];
  function flushList(): void {
    if (listBuf.length === 0) return;
    out.push(
      <ul key={`l${out.length}`}>{listBuf.map((li, i) => <li key={i}>{inline(li)}</li>)}</ul>,
    );
    listBuf = [];
  }
  function inline(s: string): ReactNode {
    const parts: ReactNode[] = [];
    let i = 0;
    let buf = '';
    while (i < s.length) {
      if (s.slice(i, i + 2) === '**') {
        const end = s.indexOf('**', i + 2);
        if (end > 0) {
          if (buf) { parts.push(buf); buf = ''; }
          parts.push(<strong key={i}>{s.slice(i + 2, end)}</strong>);
          i = end + 2;
          continue;
        }
      }
      if (s[i] === '*' && s[i + 1] !== '*') {
        const end = s.indexOf('*', i + 1);
        if (end > 0) {
          if (buf) { parts.push(buf); buf = ''; }
          parts.push(<em key={i}>{s.slice(i + 1, end)}</em>);
          i = end + 1;
          continue;
        }
      }
      if (s[i] === '`') {
        const end = s.indexOf('`', i + 1);
        if (end > 0) {
          if (buf) { parts.push(buf); buf = ''; }
          parts.push(<code key={i} style={{ background: 'var(--oo-color-active)', padding: '0 4px', borderRadius: 3 }}>{s.slice(i + 1, end)}</code>);
          i = end + 1;
          continue;
        }
      }
      buf += s[i];
      i += 1;
    }
    if (buf) parts.push(buf);
    return parts;
  }
  for (const raw of lines) {
    if (raw.startsWith('### ')) { flushList(); out.push(<h3 key={out.length}>{inline(raw.slice(4))}</h3>); }
    else if (raw.startsWith('## ')) { flushList(); out.push(<h2 key={out.length}>{inline(raw.slice(3))}</h2>); }
    else if (raw.startsWith('# ')) { flushList(); out.push(<h1 key={out.length}>{inline(raw.slice(2))}</h1>); }
    else if (raw.startsWith('- ')) { listBuf.push(raw.slice(2)); }
    else if (raw.trim()) { flushList(); out.push(<p key={out.length}>{inline(raw)}</p>); }
    else { flushList(); }
  }
  flushList();
  return (
    <div style={{ padding: 12 }}>
      <h3 style={{ margin: '0 0 8px', color: 'var(--oo-color-muted)' }}>{path}</h3>
      <div className="oo-md-preview">{out}</div>
    </div>
  );
}

// ── Panel ──────────────────────────────────────────────────────────────────

export function FileExplorerPanel(): ReactNode {
  const scena = useScena();
  const [log, setLog] = useState<string[]>([]);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(['/src', '/docs']));

  const treeNodes = useMemo(() => buildTree(), []);

  // Register the viewer components + commands on mount; dispose on unmount.
  useEffect(() => {
    const disposables = [
      scena.components.register({
        component: 'demo.fs.TextViewer',
        category: 'page',
        renderer: { kind: 'react', load: async () => ({ default: TextViewer as unknown }) },
        opens: {
          resourceKinds: ['file'],
          title: 'Text viewer',
          icon: '\u{1F4C4}︎',
          color: 'sky',
          priority: 10,
        },
      }),
      scena.components.register({
        component: 'demo.fs.JsonViewer',
        category: 'page',
        renderer: { kind: 'react', load: async () => ({ default: JsonViewer as unknown }) },
        opens: {
          resourceKinds: ['file'],
          title: 'JSON viewer',
          icon: '{ }',
          color: 'amber',
          priority: 20,
          selector: '/resource/ext == "json"' as never,
        },
      }),
      scena.components.register({
        component: 'demo.fs.MarkdownViewer',
        category: 'page',
        renderer: { kind: 'react', load: async () => ({ default: MarkdownViewer as unknown }) },
        opens: {
          resourceKinds: ['file'],
          title: 'Markdown preview',
          icon: '\u{1F4DD}︎',
          color: 'violet',
          priority: 20,
          selector: '/resource/ext == "md"' as never,
        },
      }),

      // ── Default open command (Enter / double-click)
      scena.commands.register({
        id: 'demo.fs.open',
        title: 'Open',
        icon: '\u{2197}',
        color: 'blue',
        slots: ['file:context'],
        run: (ctx) => {
          const path = ctx.store.get<string>('$/resource/id') ?? '';
          if (!path) return;
          const entry = MOCK_FS[path];
          if (!entry || isFolder(entry)) return;
          const openers = ctx.scena.components.findOpeners('file').filter((def) => {
            const sel = def.opens?.selector as string | undefined;
            if (!sel) return true;
            const m = sel.match(/\/resource\/ext\s*==\s*"([^"]+)"/);
            return m ? m[1] === entry.ext : true;
          });
          const best = openers[0]; // highest priority
          if (!best) return;
          ctx.scena.surfaces.open({
            surface: 'main',
            key: `file:${path}`,
            resource: { component: best.component, path },
          });
          ctx.host?.closeMenu();
        },
      }),

      // ── "Open with..." opens a submenu of available openers
      scena.commands.register({
        id: 'demo.fs.openWith',
        title: 'Open with…',
        icon: '\u{2197}',
        color: 'teal',
        slots: ['file:context'],
        run: (ctx) => {
          const path = ctx.store.get<string>('$/resource/id') ?? '';
          if (!path) return;
          const entry = MOCK_FS[path];
          if (!entry || isFolder(entry)) return;
          const openers = ctx.scena.components.findOpeners('file').filter((def) => {
            const sel = def.opens?.selector as string | undefined;
            if (!sel) return true;
            const m = sel.match(/\/resource\/ext\s*==\s*"([^"]+)"/);
            return m ? m[1] === entry.ext : true;
          });
          ctx.host?.pushList({
            title: 'Open with',
            items: openers.map((def) => ({
              title: def.opens?.title ?? def.component,
              icon: def.opens?.icon,
              color: def.opens?.color,
              onSelect: (h) => {
                ctx.scena.surfaces.open({
                  surface: 'main',
                  key: `file:${path}`,
                  resource: { component: def.component, path },
                });
                h.closeMenu();
              },
            })),
          });
        },
      }),

      // ── Log copy/cut/paste/drop actions
      scena.commands.register({
        id: 'demo.fs.delete',
        title: 'Delete',
        icon: '\u{1F5D1}',
        color: 'red',
        slots: ['file:context'],
        run: (ctx) => {
          const path = ctx.store.get<string>('$/resource/id') ?? '';
          if (!path) return;
          // Mock — we just log. Real impl would mutate the store/server.
          // eslint-disable-next-line no-console
          console.log('[file.delete]', path);
          ctx.host?.closeMenu();
        },
      }),
    ];

    return () => {
      for (const d of disposables) d.dispose();
    };
  }, [scena]);

  function record(line: string): void {
    setLog((prev) => [`${new Date().toLocaleTimeString()} ${line}`, ...prev].slice(0, 12));
  }

  return (
    <div className="file-explorer-panel">
      <header>
        <h2>File Explorer demo</h2>
        <p>
          Tree primitive + opener catalog. Right-click a file for the context
          menu. Double-click (or Enter) opens with the highest-priority viewer.
          Drag a file out to log a drag event. Try Ctrl/⌘+C with a selection.
        </p>
      </header>

      <div className="file-explorer-panel__row">
        <div className="file-explorer-panel__tree">
          <Tree<FsNode>
            title="MOCK FS"
            nodes={treeNodes}
            expanded={expanded}
            onExpandedChange={setExpanded}
            selectedKey={selectedKey}
            onSelect={(n) => setSelectedKey(n.key)}
            onActivate={(n) => {
              if (!n.data || isFolder(n.data)) return;
              void scena.commands.execute('demo.fs.open', undefined, {
                source: 'keybinding',
                dataContext: '$/demo/fs' as never,
              });
              // The context isn't injected because we're not in a ContextMenu —
              // set the active resource id manually so demo.fs.open can read it.
              scena.store.set('$/resource/id' as never, n.key);
              scena.store.set('$/resource/kind' as never, 'file');
              if (n.data && !isFolder(n.data)) {
                scena.store.set('$/resource/ext' as never, n.data.ext);
              }
              void scena.commands.execute('demo.fs.open');
            }}
            contextMenuSlot="file:context"
            contextFor={(n) => {
              const file = n.data && !isFolder(n.data) ? n.data : null;
              return {
                '$/resource/kind': isFolder(n.data ?? { path: '' } as FsNode) ? 'folder' : 'file',
                '$/resource/id': n.key,
                '$/resource/ext': file?.ext ?? '',
              };
            }}
            onDragStart={(e, n) => {
              e.dataTransfer.setData('text/plain', n.key);
              e.dataTransfer.effectAllowed = 'copy';
              record(`drag-start ${n.key}`);
            }}
            onCopy={(e, n) => {
              if (!n) return;
              e.preventDefault();
              e.clipboardData.setData('text/plain', n.key);
              record(`copy ${n.key}`);
            }}
            onPaste={(e, _n) => {
              const text = e.clipboardData.getData('text/plain');
              if (text) record(`paste ${text}`);
            }}
          />
        </div>

        <div className="file-explorer-panel__log">
          <h3>Event log</h3>
          {log.length === 0 ? (
            <p className="file-explorer-panel__empty">
              No events yet. Try dragging a file or copying with Ctrl/⌘+C.
            </p>
          ) : (
            <ul>{log.map((l, i) => <li key={i}>{l}</li>)}</ul>
          )}
        </div>
      </div>
    </div>
  );
}
