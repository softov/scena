import { type ReactNode, useEffect, useState } from 'react';
import { useScena, useStore } from '@softov/scena/react';
import type { Disposable } from '@softov/scena/types';

// Tests the reactive openWith path:
//   1. Initially nothing extra is registered.
//   2. Click "Register Colored Text Viewer" → adds a component opener for
//      `explorer-file`. Because `registerOpenerCommands` subscribes to
//      `scena:registry:changed` (components), the explorer's right-click
//      menu picks it up the next time it opens — no reload, no re-import.
//   3. Click "Unregister" → disposes; the menu drops the entry on next open.
//
// The viewer itself is intentionally trivial — it colors each line of the
// file body in a rotating accent palette so you can tell the new opener
// rendered (vs. the existing text viewer).

const LINE_COLORS = [
  '#ff8a80', // red 200
  '#ffcc80', // orange 200
  '#fff59d', // yellow 200
  '#a5d6a7', // green 200
  '#80deea', // cyan 200
  '#9fa8da', // indigo 200
  '#ce93d8', // purple 200
];

// Loose shape — avoids FsNode's structural-subtype narrowing trap
// (FolderEntry is a subset of FileEntry, so the TS server collapses
// `Exclude<FsNode, FolderEntry>` to `never`). We just need `body` here.
interface FileLike { body?: string }

function ColoredTextViewer({ path }: { path?: string }) {
  const entry = useStore<FileLike>(
    path ? `$/explorer/files/byPath/${path}` : undefined,
  );
  if (!path) return <div style={{ padding: 12 }}>No path</div>;
  if (!entry || typeof entry.body !== 'string') {
    return <div style={{ padding: 12 }}>Not a file</div>;
  }
  const lines = entry.body.split(/\r?\n/);
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
          lineHeight: 1.5,
          whiteSpace: 'pre',
          overflow: 'auto',
        }}
      >
        {lines.map((line, i) => (
          <div key={i} style={{ color: LINE_COLORS[i % LINE_COLORS.length] }}>
            {line || ' '}
          </div>
        ))}
      </pre>
    </div>
  );
}

const VIEWER_ID = 'explorer.ColoredTextViewer';

// Held at module scope (panel-singleton) so the registration survives this
// panel unmounting — e.g. when the user switches to another main-surface
// tab in TabLayout (single-active layouts unmount inactive panels). The
// previous version disposed inside a useEffect cleanup which ran on every
// unmount, silently unregistering as soon as the user navigated away.
let activeDisposable: Disposable | null = null;

export function RuntimeRegisterPanel(): ReactNode {
  const scena = useScena();
  // Mirror the actual registry membership rather than caching a local
  // disposable. On remount we read scena.components.get(...) so the
  // button reflects the truth even if the panel re-rendered between
  // register and unregister.
  const [isRegistered, setIsRegistered] = useState<boolean>(
    () => Boolean(scena.components.get(VIEWER_ID)),
  );

  useEffect(() => {
    setIsRegistered(Boolean(scena.components.get(VIEWER_ID)));
    const sub = scena.events.on('scena:registry:changed', (payload) => {
      if ((payload as { registry: string }).registry !== 'components') return;
      setIsRegistered(Boolean(scena.components.get(VIEWER_ID)));
    });
    return () => sub.dispose();
  }, [scena]);

  function onRegister(): void {
    if (activeDisposable) return;
    activeDisposable = scena.components.register({
      component: VIEWER_ID,
      category: 'page',
      renderer: {
        kind: 'react',
        load: async () => ({ default: ColoredTextViewer as unknown }),
      },
      opens: {
        resourceKinds: ['explorer-file'],
        title: 'Colored text viewer',
        icon: '🎨\u{FE0E}',
        color: 'pink',
        // Priority 5 — below the existing text viewer (10) so it doesn't
        // hijack the default open; it has to be picked explicitly via
        // "Open with…".
        priority: 5,
      },
    });
  }

  function onUnregister(): void {
    activeDisposable?.dispose();
    activeDisposable = null;
  }

  return (
    <div style={{ padding: 24, maxWidth: 720, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <header>
        <h2 style={{ margin: '0 0 4px' }}>Runtime opener registration</h2>
        <p style={{ margin: 0, color: 'var(--oo-color-muted)', fontSize: 13 }}>
          Proves that <code>registerOpenerCommands</code> resyncs when a viewer is
          registered/unregistered after the initial pass. Click the button, then
          open the Explorer (sidebar) and right-click any file — a new
          <strong> Colored text viewer </strong>
          option appears in the <em>Open with</em> section. Click Unregister to
          remove it (next open hides the entry).
        </p>
      </header>

      <div style={{ display: 'flex', gap: 8 }}>
        <button
          type="button"
          onClick={onRegister}
          disabled={isRegistered}
          style={{
            padding: '6px 14px',
            background: isRegistered ? 'var(--oo-color-surface)' : 'var(--oo-color-accent)',
            color: isRegistered ? 'var(--oo-color-muted)' : 'var(--oo-color-canvas)',
            border: '1px solid var(--oo-color-border)',
            borderRadius: 4,
            cursor: isRegistered ? 'default' : 'pointer',
            font: 'inherit',
          }}
        >
          {isRegistered ? '✓ Registered' : 'Register Colored Text Viewer'}
        </button>
        <button
          type="button"
          onClick={onUnregister}
          disabled={!isRegistered}
          style={{
            padding: '6px 14px',
            background: 'transparent',
            color: 'var(--oo-color-fg)',
            border: '1px solid var(--oo-color-border)',
            borderRadius: 4,
            cursor: isRegistered ? 'pointer' : 'default',
            opacity: isRegistered ? 1 : 0.5,
            font: 'inherit',
          }}
        >
          Unregister
        </button>
      </div>

      <ol style={{ color: 'var(--oo-color-muted)', fontSize: 13, lineHeight: 1.7, paddingLeft: 18, margin: 0 }}>
        <li>Click <strong>Register</strong> above.</li>
        <li>Open the Explorer activity bar entry (📁).</li>
        <li>Right-click any file (e.g. <code>/src/notes.txt</code>).</li>
        <li>The <em>Open with</em> section now lists <strong>Colored text viewer</strong> alongside the others.</li>
        <li>Pick it — the file opens with each line in a different color.</li>
        <li>Come back here and click <strong>Unregister</strong> — the option vanishes on next right-click.</li>
      </ol>
    </div>
  );
}
