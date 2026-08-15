import type { Scena, BindingPath, Disposable } from '@softov/scena/types';
import { MOCK_USERS, SHOWCASE_PANELS, type ShowcaseUser } from './data.js';
import { catalogLayoutPanelNode } from './panels/catalog-layout-panel.js';
import { catalogContentPanelNode } from './panels/catalog-content-panel.js';
import { catalogInputPanelNode } from './panels/catalog-input-panel.js';
import { composedPanelNode } from './panels/composed-panel.js';
import { dynamicListPanelNode } from './panels/dynamic-list-panel.js';
import { validationPanelNode } from './panels/validation-panel.js';
import { dashboardPanelNode, dashboardOnMount } from './panels/dashboard-panel.js';
import { SimpleDashPanel } from './panels/simple-dash-panel.js';
import { CatalogChartPanel } from './panels/catalog-chart-panel.js';
import { CatalogLinkPanel } from './panels/catalog-link-panel.js';
import { catalogGridPanelNode } from './panels/catalog-grid-panel.js';
import { CatalogFormPanel } from './panels/catalog-form-panel.js';
import { CatalogUsersPanel } from './panels/catalog-users-panel.js';
import { PlayerPanel } from './panels/player-panel.js';
import { PortaPanel } from './panels/porta-panel.js';
import { PickerPanel } from './panels/picker-panel.js';
import { FileExplorerPanel } from './panels/file-explorer-panel.js';
import { RuntimeRegisterPanel } from './panels/runtime-register-panel.js';
import { showcaseExplorerNode } from './explorer.js';

// Seeds the showcase namespace, registers each panel as a component, and
// wires the activitybar + sidebar mounts.
export function registerShowcase(scena: Scena, _subs: Disposable[]): void {
  // ── Seed data ──────────────────────────────────────────────────────────
  scena.store.set('$/showcase/users/all', MOCK_USERS);
  scena.store.set('$/showcase/filter', '');
  scena.store.set('$/showcase/panels', SHOWCASE_PANELS);
  scena.store.set('$/showcase/form', { name: 'Grace Hopper', role: 'editor' });

  // ── Computed: visible users = filter(all, search) ─────────────────────
  scena.store.computed('$/showcase/users/visible', {
    from: ['$/showcase/users/all', '$/showcase/filter'],
    select: (vals) => {
      const all = (vals['$/showcase/users/all'] as ShowcaseUser[]) ?? [];
      const filter = String(vals['$/showcase/filter'] ?? '')
        .toLowerCase()
        .trim();
      if (!filter) return all;
      return all.filter(
        (u) =>
          u.name.toLowerCase().includes(filter) ||
          u.email.toLowerCase().includes(filter) ||
          u.team.toLowerCase().includes(filter),
      );
    },
  });

  // ── Template-renderer panels (static ComponentNode trees) ─────────────
  scena.components.register({
    component: 'Showcase.CatalogLayout',
    category: 'page',
    renderer: { kind: 'template', template: catalogLayoutPanelNode },
  });
  scena.components.register({
    component: 'Showcase.CatalogContent',
    category: 'page',
    renderer: { kind: 'template', template: catalogContentPanelNode },
  });
  scena.components.register({
    component: 'Showcase.CatalogGrid',
    category: 'page',
    renderer: { kind: 'template', template: catalogGridPanelNode },
  });
  scena.components.register({
    component: 'Showcase.CatalogInput',
    category: 'page',
    renderer: { kind: 'template', template: catalogInputPanelNode },
  });
  scena.components.register({
    component: 'Showcase.Composed',
    category: 'page',
    renderer: { kind: 'template', template: composedPanelNode },
  });
  scena.components.register({
    component: 'Showcase.DynamicList',
    category: 'page',
    renderer: { kind: 'template', template: dynamicListPanelNode },
  });
  scena.components.register({
    component: 'Showcase.Validation',
    category: 'page',
    renderer: { kind: 'template', template: validationPanelNode },
  });
  scena.components.register({
    component: 'Showcase.Dashboard',
    category: 'page',
    renderer: { kind: 'template', template: dashboardPanelNode },
    onMount: dashboardOnMount,
  });

  // Simple React dashboard — useState + setInterval driving a ComponentNode.
  scena.components.register({
    component: 'Showcase.SimpleDash',
    category: 'page',
    renderer: {
      kind: 'react',
      load: async () => ({ default: SimpleDashPanel as unknown }),
    },
  });

  // Charts demo — BarChart / LineChart / Sparkline / Donut, static + live.
  scena.components.register({
    component: 'Showcase.CatalogChart',
    category: 'page',
    renderer: {
      kind: 'react',
      load: async () => ({ default: CatalogChartPanel as unknown }),
    },
  });

  // Link demo — protocol detection (tel / email / https).
  scena.components.register({
    component: 'Showcase.CatalogLink',
    category: 'page',
    renderer: {
      kind: 'react',
      load: async () => ({ default: CatalogLinkPanel as unknown }),
    },
  });

  // Forms demo — SchemaForm in controlled + store-bound modes (React).
  scena.components.register({
    component: 'Showcase.CatalogForm',
    category: 'page',
    renderer: {
      kind: 'react',
      load: async () => ({ default: CatalogFormPanel as unknown }),
    },
  });

  // Users demo — DataTable + detail page (DetailHeader + Tabs[DetailList/Form]).
  scena.components.register({
    component: 'Showcase.Users',
    category: 'page',
    renderer: {
      kind: 'react',
      load: async () => ({ default: CatalogUsersPanel as unknown }),
    },
  });

  // Player is stateful (React) — registers as a react renderer.
  scena.components.register({
    component: 'Showcase.Player',
    category: 'page',
    renderer: {
      kind: 'react',
      load: async () => ({ default: PlayerPanel as unknown }),
    },
  });

  // Porta panel also React (reads from PortaContext + useSession).
  scena.components.register({
    component: 'Showcase.Porta',
    category: 'page',
    renderer: {
      kind: 'react',
      load: async () => ({ default: PortaPanel as unknown }),
    },
  });

  // Picker family demo — exercises the new ActionList + ContextMenu +
  // useChatPicker primitives. Two chat panels at different dataContexts
  // prove per-instance isolation.
  scena.components.register({
    component: 'Showcase.Picker',
    category: 'page',
    renderer: {
      kind: 'react',
      load: async () => ({ default: PickerPanel as unknown }),
    },
  });

  // File explorer demo — Tree primitive + opener catalog.
  scena.components.register({
    component: 'Showcase.FileExplorer',
    category: 'page',
    renderer: {
      kind: 'react',
      load: async () => ({ default: FileExplorerPanel as unknown }),
    },
  });

  // Runtime opener registration demo — registers a new viewer at click
  // time; the explorer's openWith section picks it up reactively.
  scena.components.register({
    component: 'Showcase.RuntimeRegister',
    category: 'page',
    renderer: {
      kind: 'react',
      load: async () => ({ default: RuntimeRegisterPanel as unknown }),
    },
  });

  // ── Sidebar explorer — itself a template tree using DynamicChildList ──
  scena.components.register({
    component: 'ShowcaseExplorer',
    category: 'page',
    renderer: { kind: 'template', template: showcaseExplorerNode },
  });

  // ── Command: open a showcase panel as a main-surface mount ────────────
  scena.commands.register({
    id: 'showcase.open',
    title: 'Open showcase panel',
    args: { name: 'string', title: 'string?' },
    run: (ctx, args) => {
      const { name } = args as { name: string; title?: string };
      ctx.surfaces.open({
        surface: 'main',
        key: name,
        resource: { component: name },
      });
    },
  });

  // ── Command: generic store-write (used by the Modal demo trigger) ─────
  scena.commands.register({
    id: 'showcase.setStore',
    title: 'Write a value to a store path',
    run: (ctx, args) => {
      const a = (args ?? {}) as { path?: string; value?: unknown };
      if (!a.path) return;
      ctx.store.set(a.path as BindingPath, a.value);
    },
  });

  // ── Activitybar entry ─────────────────────────────────────────────────
  scena.surfaces.mount({
    surface: 'activitybar',
    key: 'showcase:activitybar',
    resource: {
      component: 'ActivityBarItem',
      icon: '🗃︎',
      label: 'Showcase',
      section: 'showcase',
      onClick: {
        functionCall: {
          call: 'sidebar.activate',
          args: { section: 'showcase' },
        },
      },
    },
  });
  scena.surfaces.mount({
    surface: 'activitybar',
    key: 'picker:activitybar',
    resource: {
      component: 'ActivityBarItem',
      icon: '⌨',
      label: 'Pickers',
      section: 'pickers',
      onClick: {
        functionCall: {
          call: 'showcase.open',
          args: {
            name: 'Showcase.Picker',
            title: 'Picker demos',
          },
        },
      },
    },
  });

  // ── Sidebar explorer mount (gated by section==='showcase') ────────────
  scena.surfaces.mount({
    surface: 'sidebar:left',
    key: 'showcase:explorer',
    when: '$/layout/surfaces/sidebar:left/section == "showcase"',
    resource: { component: 'ShowcaseExplorer' },
  });
}
