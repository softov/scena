import type { ComponentNode } from '@softov/scena/types';

// Showcase for the Grid layout: auto-fit (minColumnWidth), fixed columns, and
// "GridList" (Grid + DynamicChildList over a collection).

function statCard(icon: string, label: string, value: string): ComponentNode {
  return {
    component: 'Card',
    child: {
      component: 'Column',
      gap: 4,
      children: [
        {
          component: 'Row',
          gap: 8,
          align: 'center',
          children: [
            { component: 'Icon', name: icon, size: 18 },
            { component: 'Text', text: label, variant: 'caption', muted: true },
          ],
        },
        { component: 'Text', text: value, variant: 'h2' },
      ],
    },
  };
}

export const catalogGridPanelNode: ComponentNode = {
  component: 'Column',
  gap: 20,
  style: { padding: 20 },
  children: [
    { component: 'Text', text: 'Catalog — Grid', variant: 'h1' },
    {
      component: 'Text',
      text: 'Grid is a 2-D wrapping layout: auto-fit by minColumnWidth, or a fixed column count. "GridList" = a Grid whose children is a DynamicChildList over a collection.',
      muted: true,
    },

    { component: 'Text', text: 'Auto-fit (minColumnWidth 200) — resize the panel to reflow', variant: 'h3' },
    {
      component: 'Grid',
      minColumnWidth: 200,
      gap: 12,
      children: [
        statCard('🤖', 'Agents', '12'),
        statCard('🧠', 'Models', '5'),
        statCard('🔧', 'Tools', '34'),
        statCard('🔌', 'Channels', '7'),
        statCard('⏱', 'Crons', '9'),
        statCard('◆', 'Memory', '240 MB'),
      ],
    },

    { component: 'Text', text: 'Fixed 3 columns', variant: 'h3' },
    {
      component: 'Grid',
      columns: 3,
      gap: 12,
      children: [
        statCard('①', 'One', '1'),
        statCard('②', 'Two', '2'),
        statCard('③', 'Three', '3'),
        statCard('④', 'Four', '4'),
        statCard('⑤', 'Five', '5'),
      ],
    },

    { component: 'Text', text: 'GridList — Grid + DynamicChildList over $/showcase/users/all', variant: 'h3' },
    {
      component: 'Grid',
      minColumnWidth: 220,
      gap: 12,
      // DynamicChildList: one Card per user, expanded upstream by ViewMount.
      children: {
        path: '$/showcase/users/all',
        template: {
          component: 'Card',
          title: { path: '/name' },
          child: {
            component: 'Column',
            gap: 2,
            children: [
              { component: 'Text', text: { path: '/email' }, variant: 'caption', muted: true },
              { component: 'Text', text: { path: '/team' }, variant: 'caption', tone: 'accent' },
            ],
          },
        },
      },
    },
  ],
};
