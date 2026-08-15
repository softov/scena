import { useMemo, useState } from 'react';
import { useScena, useStore } from '@softov/scena/react';
import { Tree, type TreeNode } from '@softov/scena/ui';
import {
  basename,
  createFile,
  createFolder,
  isFolder,
  joinPath,
  logExplorerEvent,
  type FsNode,
} from './data.js';
import { moveNodeFromDrop } from './commands.js';
import './Explorer.css';

// Two independent sidebar mounts that share the explorer's reactive
// store: ExplorerFiles owns the MOCK FS tree; ExplorerEvents owns the
// log. They mount separately on `sidebar:left` and StackLayout supplies
// the collapsible/resizable section header for each — same pattern VS
// Code uses for its Explorer / Outline / Timeline sidebar panes.

function colorForExt(ext: string): string {
  if (ext === 'md') return 'violet';
  if (ext === 'json') return 'amber';
  if (ext === 'txt') return 'sky';
  return 'gray';
}
function iconForExt(ext: string): string {
  if (ext === 'md') return '\u{1F4DD}\u{FE0E}';
  if (ext === 'json') return '{' + '}';
  if (ext === 'txt') return '\u{1F4C4}\u{FE0E}';
  return '\u{1F4C4}\u{FE0E}';
}

// Convert the flat `all` list into a TreeNode hierarchy.
function buildTree(all: FsNode[]): TreeNode<FsNode>[] {
  function direct(parent: string): FsNode[] {
    return all
      .filter((n) => {
        const parts = n.path.split('/').filter(Boolean);
        const expectedDepth = parent === '/' ? 1 : parent.split('/').filter(Boolean).length + 1;
        if (parts.length !== expectedDepth) return false;
        const p = parts.length <= 1 ? '/' : '/' + parts.slice(0, -1).join('/');
        return p === parent;
      })
      .sort((a, b) => {
        const aIsDir = isFolder(a) ? 0 : 1;
        const bIsDir = isFolder(b) ? 0 : 1;
        if (aIsDir !== bIsDir) return aIsDir - bIsDir;
        return a.path.localeCompare(b.path);
      });
  }

  function toNode(n: FsNode): TreeNode<FsNode> {
    if (isFolder(n)) {
      return {
        key: n.path,
        label: basename(n.path),
        icon: '\u{1F4C1}\u{FE0E}',
        color: 'amber',
        children: direct(n.path).map(toNode),
        dropAccepting: true,
        data: n,
      };
    }
    return {
      key: n.path,
      label: basename(n.path),
      icon: iconForExt(n.ext),
      color: colorForExt(n.ext),
      draggable: true,
      data: n,
    };
  }

  return direct('/').map(toNode);
}

// ── Files pane ──────────────────────────────────────────────────────────
export function ExplorerFiles() {
  const scena = useScena();
  const all = useStore<FsNode[]>('$/explorer/files/all') ?? [];
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(['/src', '/docs']));

  const treeNodes = useMemo(() => buildTree(all), [all]);

  function openSelected(node: TreeNode<FsNode>): void {
    if (!node.data || isFolder(node.data)) return;
    scena.store.patchMany({
      '$/resource/kind': 'explorer-file',
      '$/resource/id': node.key,
      '$/resource/ext': node.data.ext,
    });
    void scena.commands.execute('explorer.open');
  }

  function onTreeDrop(e: React.DragEvent, target: TreeNode<FsNode>): void {
    const from = e.dataTransfer.getData('text/plain');
    if (!from || from === target.key) return;
    moveNodeFromDrop(scena, from, target.key);
  }

  function onNewFileAtRoot(): void {
    const name = window.prompt('New file name', 'untitled.txt');
    if (!name) return;
    createFile(scena.store, joinPath('/', name));
  }
  function onNewFolderAtRoot(): void {
    const name = window.prompt('New folder name', 'untitled');
    if (!name) return;
    createFolder(scena.store, joinPath('/', name));
  }

  return (
    <div className="explorer-files">
      <div className="explorer-files__toolbar">
        <button type="button" title="New file at root" onClick={onNewFileAtRoot}>
          + file
        </button>
        <button type="button" title="New folder at root" onClick={onNewFolderAtRoot}>
          + folder
        </button>
      </div>
      <div className="explorer-files__body">
        <Tree<FsNode>
          nodes={treeNodes}
          expanded={expanded}
          onExpandedChange={setExpanded}
          selectedKey={selectedKey}
          onSelect={(n) => setSelectedKey(n.key)}
          onActivate={openSelected}
          contextMenuSlot="file:context"
          contextFor={(n) => ({
            '$/resource/kind': n.data && isFolder(n.data) ? 'explorer-folder' : 'explorer-file',
            '$/resource/id': n.key,
            // `'ext' in n.data` narrows via the `in` operator. `!isFolder(n.data)`
            // would collapse to `never` in the IDE because FolderEntry's shape
            // (`{ path }`) is structurally a subset of FileEntry, so
            // Exclude<FsNode, FolderEntry> drops both branches.
            '$/resource/ext': n.data && 'ext' in n.data ? n.data.ext : '',
          })}
          onDragStart={(e, n) => {
            e.dataTransfer.setData('text/plain', n.key);
            e.dataTransfer.effectAllowed = 'move';
            logExplorerEvent(scena.store, `drag-start ${n.key}`);
          }}
          onDragOver={(e, n) => {
            if (n.data && isFolder(n.data)) {
              e.preventDefault();
              e.dataTransfer.dropEffect = 'move';
            }
          }}
          onDrop={onTreeDrop}
          onCopy={(e, n) => {
            if (!n) return;
            e.preventDefault();
            e.clipboardData.setData('text/plain', n.key);
            logExplorerEvent(scena.store, `copy ${n.key}`);
          }}
          onPaste={(e) => {
            const text = e.clipboardData.getData('text/plain');
            if (text) logExplorerEvent(scena.store, `paste ${text}`);
          }}
        />
      </div>
    </div>
  );
}

// ── Events pane ─────────────────────────────────────────────────────────
export function ExplorerEvents() {
  const scena = useScena();
  const events = useStore<string[]>('$/explorer/events') ?? [];

  return (
    <div className="explorer-events">
      <div className="explorer-events__toolbar">
        <button
          type="button"
          title="Clear log"
          onClick={() => scena.store.set('$/explorer/events', [])}
        >
          clear
        </button>
      </div>
      <div className="explorer-events__body">
        {events.length === 0 ? (
          <p className="explorer-events__empty">No events yet.</p>
        ) : (
          <ul className="explorer-events__log">
            {events.map((line, i) => <li key={i}>{line}</li>)}
          </ul>
        )}
      </div>
    </div>
  );
}
