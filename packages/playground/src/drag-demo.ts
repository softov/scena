import type { Disposable, Scena } from '@softov/scena/types';

// Two tabs on the right sidebar, so a tab can be dragged between it and
// `main` without opening anything first. The second one sets
// `policy.movable: false`, to show a drop that is refused.
export function registerDragDemo(scena: Scena): Disposable {
  const subs: Disposable[] = [];
  subs.push(
    scena.components.register({
      component: 'Playground.DragDemo',
      category: 'page',
      renderer: {
        kind: 'template',
        template: {
          component: 'Column',
          gap: 8,
          style: { padding: 12 },
          children: [
            { component: 'Text', text: 'Drag this tab', variant: 'h3' },
            { component: 'Text', text: 'Drop it on a main tab strip, or on a group body to join or split it.', muted: true },
            // A drop area in a JSON page: a tab or a row dropped here runs
            // `demo.tookDrop`, and stays where it was.
            {
              component: 'DropArea',
              command: 'demo.tookDrop',
              label: 'Drop a tab or a row here. It stays where it is.',
              children: [{ component: 'Text', text: { path: '$/demo/lastDrop' }, muted: true }],
            },
          ],
        },
      },
    }),
    scena.components.register({
      component: 'Playground.FixedDemo',
      category: 'page',
      renderer: {
        kind: 'template',
        template: {
          component: 'Column',
          gap: 8,
          style: { padding: 12 },
          children: [
            { component: 'Text', text: 'This tab stays', variant: 'h3' },
            { component: 'Text', text: 'It has policy.movable: false, so no other surface takes it.', muted: true },
          ],
        },
      },
    }),
  );

  subs.push(
    scena.commands.register({
      id: 'demo.tookDrop',
      title: 'Show the dropped thing',
      run: (ctx, args) => {
        const drop = (args as { drop?: { key: string; title?: unknown; from: string; surface?: string } }).drop;
        if (!drop) return;
        const title = typeof drop.title === 'string' ? drop.title : drop.key;
        const where = drop.surface ? ` from ${drop.surface}` : '';
        ctx.store.set('$/demo/lastDrop', `Took the ${drop.from} "${title}"${where}.`);
      },
    }),
  );
  scena.store.set('$/demo/lastDrop', 'Drop a tab or a row here. It stays where it is.');

  const side = scena.layout.get().surfaces['sidebar:right'];
  scena.layout.setSurface('sidebar:right', { ...side, layout: 'tab' });
  scena.surfaces.open({
    surface: 'sidebar:right',
    key: 'demo:drag',
    resource: { component: 'Playground.DragDemo' },
    props: { title: 'Drag me' },
  });
  scena.surfaces.open({
    surface: 'sidebar:right',
    key: 'demo:fixed',
    resource: { component: 'Playground.FixedDemo' },
    props: { title: 'Fixed' },
    policy: { movable: false },
  });
  return {
    dispose() {
      for (const s of subs) s.dispose();
    },
  };
}
