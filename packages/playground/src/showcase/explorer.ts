import type { ComponentNode } from '@softov/scena/types';

// The showcase explorer — itself built from the catalog using DynamicChildList.
// Dogfoods the primitive: each panel descriptor at `$/showcase/panels/<i>`
// renders one Card with an Open button whose Action.functionCall args read
// `/name` and `/title` from the per-item data context.

export const showcaseExplorerNode: ComponentNode = {
  component: 'Column',
  gap: 8,
  style: { padding: 12 },
  children: [
    { component: 'Text', text: 'Showcase', variant: 'h2' },
    {
      component: 'Text',
      text: 'Built from the catalog using DynamicChildList.',
      muted: true,
      variant: 'caption',
    },
    {
      component: 'List',
      gap: 8,
      children: {
        path: '$/showcase/panels',
        template: {
          component: 'Card',
          child: {
            component: 'Column',
            gap: 4,
            children: [
              { component: 'Text', text: { path: '/title' }, weight: 'bold' },
              {
                component: 'Text',
                text: { path: '/description' },
                muted: true,
                variant: 'caption',
              },
              {
                component: 'Button',
                label: 'Open',
                // variant: 'primary',
                onClick: {
                  functionCall: {
                    call: 'showcase.open',
                    args: {
                      name: { path: '/name' },
                      title: { path: '/title' },
                    },
                  },
                },
              },
            ],
          },
        },
      },
    },
  ],
};
