import { useState, type ReactNode } from 'react';
import { useStore } from '@softov/scena/react';
import { Tree, type TreeNode, HtmlEmbed, Svg } from '@softov/scena/ui';
import { explorerPaths, isFolder, type FsNode } from './data.js';

// Three viewers wired into the explorer's opener catalog. They read from
// `$/explorer/files/byPath/<path>` so any mutation through the data layer
// (rename, body edit, etc.) reflects live. Mirror the showcase's viewers
// in look-and-feel but read from the explorer's reactive store instead of
// a const map.

function useFile(path: string | undefined): FsNode | undefined {
  return useStore<FsNode>(path ? `${explorerPaths.prefix}${path}` : undefined);
}

export function ExplorerTextViewer({ path }: { path?: string }) {
  const entry = useFile(path);
  if (!path) return <div style={{ padding: 12 }}>No path</div>;
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

export function ExplorerJsonViewer({ path }: { path?: string }) {
  const entry = useFile(path);
  if (!path) return <div style={{ padding: 12 }}>No path</div>;
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

export function ExplorerMarkdownViewer({ path }: { path?: string }) {
  const entry = useFile(path);
  if (!path) return <div style={{ padding: 12 }}>No path</div>;
  if (!entry || isFolder(entry)) return <div style={{ padding: 12 }}>Not a file</div>;
  // Tiny inline markdown renderer (headings, bold, italics, list items)
  // — identical to the showcase's renderer; copied to keep this module
  // self-contained.
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
          parts.push(<code key={i}>{s.slice(i + 1, end)}</code>);
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

// ── JSON tree viewer ──────────────────────────────────────────────────────
// Renders the parsed JSON as an expandable Tree (one row per key). Primitive
// values render inline next to the key; objects/arrays render as branches.

interface JsonRow { keyPath: string; }

function buildJsonNodes(value: unknown, prefix = '$'): TreeNode<JsonRow>[] {
  if (value === null || typeof value !== 'object') return [];
  const entries = Array.isArray(value)
    ? value.map((v, i) => [String(i), v] as const)
    : Object.entries(value as Record<string, unknown>);
  return entries.map(([k, v]) => {
    const id = `${prefix}.${k}`;
    const isContainer = v !== null && typeof v === 'object';
    return {
      key: id,
      label: (
        <span style={{ fontFamily: 'var(--oo-font-mono)', fontSize: 12 }}>
          <span style={{ color: 'var(--oo-color-muted)' }}>{k}</span>
          {!isContainer ? (
            <>
              <span style={{ color: 'var(--oo-color-muted)' }}>: </span>
              <span style={{ color: previewColor(v) }}>{previewValue(v)}</span>
            </>
          ) : (
            <span style={{ color: 'var(--oo-color-muted)' }}>
              {Array.isArray(v) ? ` [${v.length}]` : ` { ${Object.keys(v as object).length} }`}
            </span>
          )}
        </span>
      ),
      children: isContainer ? buildJsonNodes(v, id) : undefined,
      icon: Array.isArray(v) ? '[]' : isContainer ? '{}' : leafIcon(v),
      color: isContainer ? 'amber' : valueColor(v),
      data: { keyPath: id },
    };
  });
}

function previewValue(v: unknown): string {
  if (v === null) return 'null';
  if (typeof v === 'string') return JSON.stringify(v);
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  return String(v);
}
function previewColor(v: unknown): string {
  if (typeof v === 'string') return 'var(--oo-color-green, #6bdf6b)';
  if (typeof v === 'number') return 'var(--oo-color-amber, #ffb86c)';
  if (typeof v === 'boolean') return 'var(--oo-color-blue, #7aa7ff)';
  if (v === null) return 'var(--oo-color-muted)';
  return 'var(--oo-color-fg)';
}
function leafIcon(v: unknown): string {
  if (typeof v === 'string') return '"';
  if (typeof v === 'number') return '#';
  if (typeof v === 'boolean') return v ? 'T' : 'F';
  if (v === null) return '·';
  return '?';
}
function valueColor(v: unknown): string {
  if (typeof v === 'string') return 'green';
  if (typeof v === 'number') return 'amber';
  if (typeof v === 'boolean') return 'blue';
  return 'muted';
}

export function ExplorerJsonTreeViewer({ path }: { path?: string }) {
  const entry = useFile(path);
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(['$']));
  if (!path) return <div style={{ padding: 12 }}>No path</div>;
  if (!entry || isFolder(entry)) return <div style={{ padding: 12 }}>Not a file</div>;
  let parsed: unknown;
  let error: string | null = null;
  try { parsed = JSON.parse(entry.body); } catch (err) {
    error = err instanceof Error ? err.message : String(err);
  }
  if (error) {
    return (
      <div style={{ padding: 12 }}>
        <h3 style={{ margin: '0 0 8px' }}>{path}</h3>
        <pre style={{ color: 'var(--oo-color-red, salmon)' }}>JSON parse error: {error}</pre>
      </div>
    );
  }
  // Top-level wrap so the root object/array shows as a single expandable row.
  const rootNodes: TreeNode<JsonRow>[] = parsed !== null && typeof parsed === 'object'
    ? [
        {
          key: '$',
          label: (
            <span style={{ fontFamily: 'var(--oo-font-mono)', fontSize: 12 }}>
              {Array.isArray(parsed) ? `[${parsed.length}]` : `{ ${Object.keys(parsed as object).length} }`}
            </span>
          ),
          icon: Array.isArray(parsed) ? '[]' : '{}',
          color: 'amber',
          children: buildJsonNodes(parsed, '$'),
          data: { keyPath: '$' },
        },
      ]
    : [];
  return (
    <div style={{ padding: 12, height: '100%', display: 'flex', flexDirection: 'column' }}>
      <h3 style={{ margin: '0 0 8px' }}>{path}</h3>
      <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
        <Tree<JsonRow>
          nodes={rootNodes}
          expanded={expanded}
          onExpandedChange={setExpanded}
        />
      </div>
    </div>
  );
}

// ── HTML viewer ───────────────────────────────────────────────────────────
// iframe sandbox via HtmlEmbed. No scripts; same-origin allowed so styles
// from the doc apply normally.

export function ExplorerHtmlViewer({ path }: { path?: string }) {
  const entry = useFile(path);
  if (!path) return <div style={{ padding: 12 }}>No path</div>;
  if (!entry || isFolder(entry)) return <div style={{ padding: 12 }}>Not a file</div>;
  return (
    <div style={{ padding: 12, height: '100%', display: 'flex', flexDirection: 'column' }}>
      <h3 style={{ margin: '0 0 8px' }}>{path}</h3>
      <div style={{ flex: 1, minHeight: 0 }}>
        <HtmlEmbed html={entry.body} height="100%" title={path} />
      </div>
    </div>
  );
}

// ── SVG viewer ────────────────────────────────────────────────────────────
// Uses the Svg primitive's `markup` mode to render the file's body inline.

export function ExplorerSvgViewer({ path }: { path?: string }) {
  const entry = useFile(path);
  if (!path) return <div style={{ padding: 12 }}>No path</div>;
  if (!entry || isFolder(entry)) return <div style={{ padding: 12 }}>Not a file</div>;
  return (
    <div style={{ padding: 12, height: '100%', display: 'flex', flexDirection: 'column' }}>
      <h3 style={{ margin: '0 0 8px' }}>{path}</h3>
      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--oo-color-surface)',
          border: '1px solid var(--oo-color-border)',
          borderRadius: 4,
          overflow: 'auto',
        }}
      >
        <Svg markup={entry.body} width="100%" height="100%" />
      </div>
    </div>
  );
}
