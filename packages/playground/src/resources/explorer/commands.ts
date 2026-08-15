import type { Command } from '@softov/scena/types';
import {
  createFile,
  createFolder,
  isFolder,
  joinPath,
  logExplorerEvent,
  moveNode,
  removeNode,
  type FsNode,
} from './data.js';

// Commands the sidebar explorer registers. Gated by `$/resource/kind` so
// they only show when the right-click target came from THIS explorer (the
// showcase panel uses its own `file:context` items with different IDs).
//
// Naming convention: `explorer.*` — paired with the resource kinds
// `explorer-file` and `explorer-folder`.

const FILE_KIND_GUARD = '$/resource/kind == "explorer-file"';
const FOLDER_KIND_GUARD = '$/resource/kind == "explorer-folder"';
const ANY_KIND_GUARD =
  '$/resource/kind == "explorer-file" || $/resource/kind == "explorer-folder"';

export const explorerCommands: Command[] = [
  // ── Open (file only) ─────────────────────────────────────────────────────
  {
    id: 'explorer.open',
    title: 'Open',
    icon: '\u{2197}',
    color: 'blue',
    slots: ['file:context'],
    when: FILE_KIND_GUARD,
    run: (ctx) => {
      const path = ctx.store.get<string>('$/resource/id') ?? '';
      const entry = ctx.store.get<FsNode>(`$/explorer/files/byPath/${path}`);
      if (!entry || isFolder(entry)) return;
      const ext = entry.ext;
      // Pick the highest-priority opener whose selector matches the ext.
      const openers = ctx.scena.components.findOpeners('explorer-file').filter((def) => {
        const sel = def.opens?.selector as string | undefined;
        if (!sel) return true;
        const m = sel.match(/\/resource\/ext\s*==\s*"([^"]+)"/);
        return m ? m[1] === ext : true;
      });
      const best = openers[0];
      if (!best) return;
      // Include the viewer's component in the key so `Open with…` can mount
      // additional viewers side-by-side (e.g. README.md open as Markdown
      // AND Text in two tabs simultaneously). Same file + same viewer
      // re-uses the existing tab.
      ctx.scena.surfaces.open({
        surface: 'main',
        key: `explorer:${best.component}:${path}`,
        resource: { component: best.component, path },
      });
      logExplorerEvent(ctx.store, `open ${path} via ${best.component}`);
      ctx.host?.closeMenu();
    },
  },

  // ── New file (folder only — creates inside the right-clicked folder) ─────
  {
    id: 'explorer.newFile',
    title: 'New file…',
    icon: '\u{1F4C4}',
    color: 'sky',
    slots: ['file:context'],
    when: FOLDER_KIND_GUARD,
    run: (ctx) => {
      const parent = ctx.store.get<string>('$/resource/id') ?? '/';
      // No native prompt indirection — keep the demo loop tight; a real
      // app would push an inline picker here.
      const name = typeof window !== 'undefined' ? window.prompt('New file name', 'untitled.txt') : null;
      if (!name) return;
      createFile(ctx.store, joinPath(parent, name));
      ctx.host?.closeMenu();
    },
  },

  // ── New folder (folder only) ─────────────────────────────────────────────
  {
    id: 'explorer.newFolder',
    title: 'New folder…',
    icon: '\u{1F4C1}',
    color: 'amber',
    slots: ['file:context'],
    when: FOLDER_KIND_GUARD,
    run: (ctx) => {
      const parent = ctx.store.get<string>('$/resource/id') ?? '/';
      const name = typeof window !== 'undefined' ? window.prompt('New folder name', 'untitled') : null;
      if (!name) return;
      createFolder(ctx.store, joinPath(parent, name));
      ctx.host?.closeMenu();
    },
  },

  // ── Delete (file or folder) ──────────────────────────────────────────────
  {
    id: 'explorer.delete',
    title: 'Delete',
    icon: '\u{1F5D1}',
    color: 'red',
    slots: ['file:context'],
    when: ANY_KIND_GUARD,
    run: (ctx) => {
      const path = ctx.store.get<string>('$/resource/id') ?? '';
      if (!path) return;
      removeNode(ctx.store, path);
      // Mount keys now embed the viewer component (`explorer:<viewer>:<path>`)
      // so a file may have several open tabs. Close every mount whose key
      // resolves to this path — including descendants when a folder is
      // deleted (their keys end with `:<descendant-path>`).
      const prefix = path === '/' ? '/' : path + '/';
      for (const m of ctx.scena.surfaces.listAt('main')) {
        if (!m.key.startsWith('explorer:')) continue;
        const tail = m.key.slice('explorer:'.length);
        const viewerEnd = tail.indexOf(':');
        if (viewerEnd === -1) continue;
        const mountPath = tail.slice(viewerEnd + 1);
        if (mountPath === path || mountPath.startsWith(prefix)) {
          ctx.surfaces.close(m.key, { reason: 'deleted' });
        }
      }
      ctx.host?.closeMenu();
    },
  },

  // ── Copy key (debug helper) ──────────────────────────────────────────────
  {
    id: 'explorer.copyPath',
    title: 'Copy path',
    icon: '\u{2398}',
    color: 'sky',
    slots: ['file:context'],
    when: ANY_KIND_GUARD,
    run: (ctx) => {
      const path = ctx.store.get<string>('$/resource/id') ?? '';
      if (!path) return;
      void navigator.clipboard?.writeText(path);
      logExplorerEvent(ctx.store, `copy-path ${path}`);
      ctx.host?.closeMenu();
    },
  },
];

// Convenience for the move operation — fired from the Tree's drop handler
// rather than as a menu command, because the source/target are determined
// by the drag rather than the right-click context.
export function moveNodeFromDrop(
  scena: { store: import('@softov/scena/types').ReactiveStore },
  from: string,
  targetPath: string,
): void {
  // The drop target is either a folder (drop inside) or a file (drop into
  // the file's parent). Normalize here so the Explorer.tsx doesn't have to.
  const targetNode = scena.store.get<FsNode>(`$/explorer/files/byPath/${targetPath}`);
  const folderPath =
    targetNode && isFolder(targetNode)
      ? targetPath
      : targetPath.split('/').slice(0, -1).join('/') || '/';
  moveNode(scena.store, from, folderPath);
}
