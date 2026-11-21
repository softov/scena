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
