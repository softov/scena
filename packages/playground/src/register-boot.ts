import type { BindingPath, Scena } from '@softov/scena/types';
import { registerLayoutCommands, setLocale, translate } from '@softov/scena';

// Boot phase: the minimum scena needs for the Porta login wall — which renders
// its UI by direct import, NOT through the component registry. The component
// catalog + layout strategies are NOT registered here; they're registered in
// register-shell.ts (post-login), so the boot bundle stays tiny and the wall
// paints fast. Only the (cheap, component-free) command registrations live here.
export function registerBoot(scena: Scena): void {
  // Mount/group/surface commands from COMMANDS-list.md — slot-driven and
  // shared across every layout that injects the right capability paths
  // (TabLayout, TabPanelLayout, SplitLayout, ...).
  registerLayoutCommands(scena);

  // Phase 5 demo: `$/workspace` is backed by a localStorage ScopeBackend (see
  // App.tsx). This counter is read from the persisted backend, incremented, and
  // written back — so it grows by one on every reload, proving the seam.
  const visits = (scena.store.get<number>('$/workspace/visits' as BindingPath) ?? 0) + 1;
  scena.store.set('$/workspace/visits' as BindingPath, visits);
  console.log('[scena-dev] $/workspace/visits (persisted across reloads):', visits);

  // i18n demo: messages are registered at App module load; `$/t/*` is backed by
  // the i18n ScopeBackend (see App.tsx). Bind `{ path: '$/t/wall/title' }` or
  // use useT(). Flip locale live from the console: setLocale('pt').
  console.log('[scena-dev] i18n:', translate('demo.greeting'));
  (window as unknown as { setLocale: typeof setLocale }).setLocale = setLocale;

  console.log('registerBoot: registering dev chrome commands');
  scena.commands.register({
    id: 'sidebar.activate',
    title: 'Activate sidebar section',
    run: (ctx, args) => {
      const section = (args as { section?: string } | undefined)?.section;
      if (!section) return;
      // Section and visibility are both sidebar:left layout state, written
      // together. `visible: true` is the point: activating a section from the
      // activity bar has to OPEN the sidebar, otherwise clicking an icon while
      // it is closed just swaps the section behind a hidden panel and looks
      // like nothing happened. Keeping section in layout state (rather than a
      // parallel `$/ui/...` path) means one store and one persistence path.
      const cur = ctx.scena.layout.get().surfaces['sidebar:left'];
      ctx.scena.layout.setSurface('sidebar:left', { ...cur, section, visible: true });
    },
  });
  scena.commands.register({
    id: 'sidebar.toggleRight',
    title: 'Toggle right sidebar',
    run: (ctx) => {
      const current = ctx.scena.layout.get().surfaces['sidebar:right']?.visible ?? false;
      ctx.scena.layout.setSurface('sidebar:right', { visible: !current });
    },
  });
  scena.commands.register({
    id: 'sidebar.toggleLeft',
    title: 'Toggle left sidebar',
    run: (ctx) => {
      const current = ctx.scena.layout.get().surfaces['sidebar:left']?.visible ?? true;
      ctx.scena.layout.setSurface('sidebar:left', { visible: !current });
    },
  });
  scena.commands.register({
    id: 'main.setLayout',
    title: 'Switch main layout',
    args: { layout: 'string' },
    run: (ctx, args) => {
      const next = (args as { layout: string }).layout;
      ctx.scena.layout.setSurface('main', { layout: next });
    },
  });
}
