import type { Scena } from '@softov/scena/types';
import { combineDisposables, registerOpenerCommands } from '@softov/scena';
import { ExplorerFiles, ExplorerEvents } from './Explorer.js';
import {
  ExplorerHtmlViewer,
  ExplorerJsonTreeViewer,
  ExplorerJsonViewer,
  ExplorerMarkdownViewer,
  ExplorerSvgViewer,
  ExplorerTextViewer,
} from './viewers.js';
import {
  basename,
  explorerDataProvider,
  isFolder,
  logExplorerEvent,
  type FsNode,
} from './data.js';
import { explorerCommands } from './commands.js';

export function registerExplorer(scena: Scena) {
  const subs = [
    scena.store.registerDataProvider(explorerDataProvider),

    // Sidebar panes. Two independent components so StackLayout on
    // sidebar:left can render each as its own collapsible/resizable
    // section (VS Code-style Explorer / Outline split). The section
    // header strip + collapse + resize come from StackLayout — the
    // components only render their toolbar + body.
    scena.components.register({
      component: 'ExplorerFiles',
      category: 'page',
      renderer: { kind: 'react', load: async () => ({ default: ExplorerFiles as unknown }) },
    }),
    scena.components.register({
      component: 'ExplorerEvents',
      category: 'page',
      renderer: { kind: 'react', load: async () => ({ default: ExplorerEvents as unknown }) },
    }),

    // Viewer components — distinct IDs from the showcase's `demo.fs.*` so
    // both can coexist when both panels are active.
    scena.components.register({
      component: 'explorer.TextViewer',
      category: 'page',
      renderer: { kind: 'react', load: async () => ({ default: ExplorerTextViewer as unknown }) },
      opens: {
        resourceKinds: ['explorer-file'],
        title: 'Text viewer',
        icon: '\u{1F4C4}\u{FE0E}',
        color: 'sky',
        priority: 10,
      },
    }),
    scena.components.register({
      component: 'explorer.JsonViewer',
      category: 'page',
      renderer: { kind: 'react', load: async () => ({ default: ExplorerJsonViewer as unknown }) },
      opens: {
        resourceKinds: ['explorer-file'],
        title: 'JSON viewer',
        icon: '{ }',
        color: 'amber',
        priority: 20,
        selector: '/resource/ext == "json"' as never,
      },
    }),
    scena.components.register({
      component: 'explorer.MarkdownViewer',
      category: 'page',
      renderer: { kind: 'react', load: async () => ({ default: ExplorerMarkdownViewer as unknown }) },
      opens: {
        resourceKinds: ['explorer-file'],
        title: 'Markdown preview',
        icon: '\u{1F4DD}\u{FE0E}',
        color: 'violet',
        priority: 20,
        selector: '/resource/ext == "md"' as never,
      },
    }),
    scena.components.register({
      component: 'explorer.JsonTreeViewer',
      category: 'page',
      renderer: { kind: 'react', load: async () => ({ default: ExplorerJsonTreeViewer as unknown }) },
      opens: {
        resourceKinds: ['explorer-file'],
        title: 'JSON tree',
        icon: '\u{1F333}\u{FE0E}', // tree
        color: 'green',
        // Higher priority than raw JSON viewer so .json files default-open
        // as a tree; raw stays available via "Open with".
        priority: 30,
        selector: '/resource/ext == "json"' as never,
      },
    }),
    scena.components.register({
      component: 'explorer.HtmlViewer',
      category: 'page',
      renderer: { kind: 'react', load: async () => ({ default: ExplorerHtmlViewer as unknown }) },
      opens: {
        resourceKinds: ['explorer-file'],
        title: 'HTML preview',
        icon: '\u{1F310}\u{FE0E}', // globe
        color: 'blue',
        priority: 30,
        selector: '/resource/ext == "html"' as never,
      },
    }),
    scena.components.register({
      component: 'explorer.SvgViewer',
      category: 'page',
      renderer: { kind: 'react', load: async () => ({ default: ExplorerSvgViewer as unknown }) },
      opens: {
        resourceKinds: ['explorer-file'],
        title: 'SVG preview',
        icon: '\u{1F3A8}\u{FE0E}', // palette
        color: 'purple',
        priority: 30,
        selector: '/resource/ext == "svg"' as never,
      },
    }),

    ...explorerCommands.map((c) => scena.commands.register(c)),

    // Auto-generated "Open with …" commands — one per registered viewer.
    // Gated by `$/resource/kind == "explorer-file"` plus the viewer's own
    // `opens.selector` (e.g. `.json` only shows for json files). Rendered
    // as a clustered section in the right-click menu via `category: 'Open with'`.
    // Same commands populate the right-click menu on a tree row AND the
    // inline action buttons next to the active mount's tab. The view/title
    // case relies on the focus-mirror listener below to set $/resource/*
    // when an explorer mount becomes active.
    registerOpenerCommands(scena, {
      resourceKind: 'explorer-file',
      slots: ['file:context', 'view/title'],
      mountKey: (path, viewer) => `explorer:${viewer}:${path}`,
      resourceProps: (path) => ({ path }),
      // Tab labels show the file's basename, not its full path. Each
      // viewer's `opens.icon` / `opens.color` flow through so a
      // Markdown-opened .md tab shows the violet memo glyph.
      resourceTitle: (path) => basename(path),
      onOpen: (ctx, viewer, path) => {
        logExplorerEvent(ctx.store, `open ${path} via ${viewer.component}`);
      },
    }),

    scena.surfaces.mount({
      surface: 'activitybar',
      key: 'explorer:activitybar',
      resource: {
        component: 'ActivityBarItem',
        icon: '\u{1F4C1}\u{FE0E}', // 📁
        label: 'Explorer',
        section: 'explorer',
        onClick: { functionCall: { call: 'sidebar.activate', args: { section: 'explorer' } } },
      },
    }),

    // Two independent mounts on sidebar:left. StackLayout (selected for
    // sidebar:left while the explorer section is active — see
    // register-shell.ts) stacks them as collapsible sections. Mount keys
    // stay machine-stable (`explorer:*`) while `display` carries the
    // human-readable section header text + icon + color.
    scena.surfaces.mount({
      surface: 'sidebar:left',
      key: 'explorer:files',
      when: '$/layout/surfaces/sidebar:left/section == "explorer"',
      resource: { component: 'ExplorerFiles' },
      props: { title: 'Files', icon: '\u{1F4C1}\u{FE0E}', color: 'amber' },
    }),
    scena.surfaces.mount({
      surface: 'sidebar:left',
      key: 'explorer:events',
      when: '$/layout/surfaces/sidebar:left/section == "explorer"',
      resource: { component: 'ExplorerEvents' },
      props: { title: 'Event log', icon: '\u{1F4DC}\u{FE0E}', color: 'sky' },
    }),

    // Mount-focus mirror. When an explorer mount becomes active (key shape
    // `explorer:<viewer>:<path>`), write the active file's identity to
    // $/resource/* so any slot-driven command gated on the resource kind
    // (e.g. the auto-generated openWith commands in `view/title`) appears
    // for the right file. register-shell's generic listener doesn't help
    // here because parseActiveContext splits on the first `:` and yields
    // kind='explorer', not the kind the openers gate on (`explorer-file`).
    scena.events.on('scena:mount:focused', (raw) => {
      const ev = raw as { key: string; surface: string };
      if (ev.surface !== 'main' || !ev.key.startsWith('explorer:')) return;
      // Drop the leading `explorer:` prefix, then drop the viewer segment;
      // the rest is the path (which itself starts with `/` and may contain
      // additional colons in theory — splitting on the first `:` after the
      // prefix isolates the viewer name safely).
      const afterPrefix = ev.key.slice('explorer:'.length);
      const sep = afterPrefix.indexOf(':');
      if (sep === -1) return;
      const path = afterPrefix.slice(sep + 1);
      const entry = scena.store.get<FsNode>(`$/explorer/files/byPath/${path}`);
      if (!entry) return;
      scena.store.patchMany({
        '$/resource/kind': 'explorer-file',
        '$/resource/id': path,
        '$/resource/ext': isFolder(entry) ? '' : entry.ext,
      });
    }),
  ];

  return combineDisposables(...subs);
}
