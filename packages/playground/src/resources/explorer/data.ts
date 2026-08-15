import type { BindingPath, DataProviderDefinition, ReactiveStore } from '@softov/scena/types';

// Mock filesystem backed by the reactive store so the sidebar explorer and
// any other consumer re-render automatically on create / remove / move.
// Mirrors the showcase's MOCK_FS so files / contents look identical; lives
// separately so the showcase keeps its self-contained const-based version.
//
// Store layout:
//   $/explorer/files/byPath/<path>   — single FsNode
//   $/explorer/files/all             — ordered FsNode[] (sorted folders first)
//   $/explorer/events                — most-recent-first string[] (cap 50)
//
// Mutations write through `mutate*` helpers below — they update both the
// individual path entry AND the `all` array so the Tree primitive (which
// reads the array via useStore) re-renders without extra subscriptions.

export interface FileEntry {
  path: string;
  ext: string;
  body: string;
}

export interface FolderEntry {
  path: string;
  // Make FolderEntry disjoint from FileEntry: without these, FileEntry is a
  // structural subtype of FolderEntry and `!isFolder(n)` narrows to `never`.
  ext?: never;
  body?: never;
}

export type FsNode = FileEntry | FolderEntry;

export function isFolder(n: FsNode): n is FolderEntry {
  return !('body' in n);
}

export function basename(path: string): string {
  return path.split('/').filter(Boolean).pop() ?? path;
}

export function parentPath(path: string): string {
  const parts = path.split('/').filter(Boolean);
  return parts.length <= 1 ? '/' : '/' + parts.slice(0, -1).join('/');
}

export function joinPath(parent: string, name: string): string {
  if (parent === '/') return '/' + name;
  return parent + '/' + name;
}

const INITIAL: Record<string, FsNode> = {
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
    body: JSON.stringify(
      {
        users: ['ada', 'grace', 'alan'],
        flags: { betaUI: true, telemetry: false },
        counts: { total: 42, active: 18 },
        history: [
          { ts: 1, action: 'login' },
          { ts: 2, action: 'open' },
        ],
      },
      null,
      2,
    ),
  },
  '/src/index.html': {
    path: '/src/index.html',
    ext: 'html',
    body:
      '<!doctype html>\n<html>\n  <head><title>Hello</title>\n    <style>body{font:14px/1.4 system-ui;color:#333;padding:24px}h1{color:#06c}</style>\n  </head>\n  <body>\n    <h1>Hello from the mock filesystem</h1>\n    <p>This document is rendered inside a sandboxed iframe by <code>HtmlEmbed</code>.</p>\n    <ul><li>One</li><li>Two</li><li>Three</li></ul>\n  </body>\n</html>\n',
  },
  '/assets': { path: '/assets' },
  '/assets/logo.svg': {
    path: '/assets/logo.svg',
    ext: 'svg',
    body:
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">\n' +
      '  <defs><linearGradient id="g" x1="0" x2="1" y1="0" y2="1">\n' +
      '    <stop offset="0%" stop-color="#7aa7ff"/>\n' +
      '    <stop offset="100%" stop-color="#b88aff"/>\n' +
      '  </linearGradient></defs>\n' +
      '  <circle cx="60" cy="60" r="48" fill="url(#g)"/>\n' +
      '  <text x="60" y="68" text-anchor="middle" font-family="system-ui" font-size="28" fill="#fff">SVG</text>\n' +
      '</svg>',
  },
};

const STORE_PREFIX = '$/explorer/files/byPath/';
const STORE_ALL = '$/explorer/files/all';
const STORE_EVENTS = '$/explorer/events';
const EVENT_CAP = 50;

function sortNodes(nodes: FsNode[]): FsNode[] {
  return [...nodes].sort((a, b) => {
    const aIsDir = isFolder(a) ? 0 : 1;
    const bIsDir = isFolder(b) ? 0 : 1;
    if (aIsDir !== bIsDir) return aIsDir - bIsDir;
    return a.path.localeCompare(b.path);
  });
}

// Sync `$/explorer/files/all` from `byPath/*`. Called after every mutation.
function reindex(store: ReactiveStore): void {
  const all: FsNode[] = [];
  for (const key of (store as ReactiveStore & { _internalKeys?: () => BindingPath[] })._internalKeys?.() ?? []) {
    if (!key.startsWith(STORE_PREFIX)) continue;
    const node = store.get<FsNode>(key);
    if (node) all.push(node);
  }
  store.set(STORE_ALL, sortNodes(all));
}

function logEvent(store: ReactiveStore, line: string): void {
  const current = store.get<string[]>(STORE_EVENTS) ?? [];
  const stamped = `${new Date().toLocaleTimeString()} ${line}`;
  store.set(STORE_EVENTS, [stamped, ...current].slice(0, EVENT_CAP));
}

export const explorerDataProvider: DataProviderDefinition = {
  namespace: 'explorer',
  load: 'lazy',
  provider: {
    load(store) {
      for (const node of Object.values(INITIAL)) {
        store.set(`${STORE_PREFIX}${node.path}`, node);
      }
      reindex(store);
      store.set(STORE_EVENTS, []);
    },
  },
};

// ── Mutators ──────────────────────────────────────────────────────────────
// All mutations: write to the store, reindex, emit an event line. Failures
// (e.g. createFile at an existing path) return false; the caller logs the
// reason.

export function createFile(
  store: ReactiveStore,
  path: string,
  body = '',
): boolean {
  if (store.get(`${STORE_PREFIX}${path}`)) {
    logEvent(store, `create-failed ${path} (exists)`);
    return false;
  }
  const parts = path.split('/').filter(Boolean);
  const ext = (parts[parts.length - 1] ?? '').split('.').pop() ?? '';
  const file: FileEntry = { path, ext, body };
  store.set(`${STORE_PREFIX}${path}`, file);
  reindex(store);
  logEvent(store, `create ${path}`);
  return true;
}

export function createFolder(store: ReactiveStore, path: string): boolean {
  if (store.get(`${STORE_PREFIX}${path}`)) {
    logEvent(store, `mkdir-failed ${path} (exists)`);
    return false;
  }
  const folder: FolderEntry = { path };
  store.set(`${STORE_PREFIX}${path}`, folder);
  reindex(store);
  logEvent(store, `mkdir ${path}`);
  return true;
}

// Remove a path. If it's a folder, also remove every descendant.
export function removeNode(store: ReactiveStore, path: string): boolean {
  const node = store.get<FsNode>(`${STORE_PREFIX}${path}`);
  if (!node) {
    logEvent(store, `remove-failed ${path} (not found)`);
    return false;
  }
  const toRemove = [path];
  if (isFolder(node)) {
    const prefix = path === '/' ? '/' : path + '/';
    for (const key of (store as ReactiveStore & { _internalKeys?: () => BindingPath[] })._internalKeys?.() ?? []) {
      if (!key.startsWith(STORE_PREFIX)) continue;
      const p = key.slice(STORE_PREFIX.length);
      if (p !== path && p.startsWith(prefix)) toRemove.push(p);
    }
  }
  for (const p of toRemove) store.delete(`${STORE_PREFIX}${p}`);
  reindex(store);
  logEvent(store, `remove ${path}${toRemove.length > 1 ? ` (+${toRemove.length - 1} descendants)` : ''}`);
  return true;
}

// Move `from` → into `targetFolder`. The new path is `targetFolder/basename(from)`.
// Folders move with all descendants (paths rewritten).
export function moveNode(
  store: ReactiveStore,
  from: string,
  targetFolder: string,
): boolean {
  const node = store.get<FsNode>(`${STORE_PREFIX}${from}`);
  if (!node) {
    logEvent(store, `move-failed ${from} (not found)`);
    return false;
  }
  const target = store.get<FsNode>(`${STORE_PREFIX}${targetFolder}`);
  if (targetFolder !== '/' && (!target || !isFolder(target))) {
    logEvent(store, `move-failed ${from} → ${targetFolder} (target not a folder)`);
    return false;
  }
  const newPath = joinPath(targetFolder, basename(from));
  if (newPath === from) return false; // no-op
  if (store.get(`${STORE_PREFIX}${newPath}`)) {
    logEvent(store, `move-failed ${from} → ${newPath} (collides)`);
    return false;
  }
  // Prevent moving a folder into itself or its descendants.
  if (isFolder(node) && (newPath === from || newPath.startsWith(from + '/'))) {
    logEvent(store, `move-failed ${from} → ${newPath} (cycle)`);
    return false;
  }

  if (isFolder(node)) {
    // Collect all descendants first to avoid mutating during iteration.
    const oldPrefix = from === '/' ? '/' : from + '/';
    const moves: Array<{ oldPath: string; newPath: string; node: FsNode }> = [
      { oldPath: from, newPath, node: { ...node, path: newPath } },
    ];
    for (const key of (store as ReactiveStore & { _internalKeys?: () => BindingPath[] })._internalKeys?.() ?? []) {
      if (!key.startsWith(STORE_PREFIX)) continue;
      const p = key.slice(STORE_PREFIX.length);
      if (p === from || !p.startsWith(oldPrefix)) continue;
      const child = store.get<FsNode>(key);
      if (!child) continue;
      const childNew = newPath + p.slice(from.length);
      moves.push({ oldPath: p, newPath: childNew, node: { ...child, path: childNew } });
    }
    for (const m of moves) store.delete(`${STORE_PREFIX}${m.oldPath}`);
    for (const m of moves) store.set(`${STORE_PREFIX}${m.newPath}`, m.node);
  } else {
    const moved: FileEntry = { ...(node as FileEntry), path: newPath };
    store.delete(`${STORE_PREFIX}${from}`);
    store.set(`${STORE_PREFIX}${newPath}`, moved);
  }
  reindex(store);
  logEvent(store, `move ${from} → ${newPath}`);
  return true;
}

// Caller-side helper: just append a free-form event (open/drag/copy/etc.).
export function logExplorerEvent(store: ReactiveStore, line: string): void {
  logEvent(store, line);
}

export const explorerPaths = {
  prefix: STORE_PREFIX,
  all: STORE_ALL,
  events: STORE_EVENTS,
} as const;
