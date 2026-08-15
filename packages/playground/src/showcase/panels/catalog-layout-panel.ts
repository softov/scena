import type { ComponentNode } from '@softov/scena/types';

function entry(title: string, body: ComponentNode): ComponentNode {
  return { component: 'Card', title, child: body };
}

export const catalogLayoutPanelNode: ComponentNode = {
  component: 'Column',
  gap: 16,
  style: { padding: 16 },
  children: [
    { component: 'Text', text: 'Catalog — Layout', variant: 'h1' },
    {
      component: 'Text',
      text: 'Row, Column, Card, Divider, List, Tabs, Modal.',
      muted: true,
    },

    entry('Row', {
      component: 'Row',
      gap: 12,
      align: 'center',
      justify: 'spaceBetween',
      children: [
        { component: 'Text', text: 'Left' },
        { component: 'Text', text: 'Middle' },
        { component: 'Text', text: 'Right' },
      ],
    }),

    entry('Column', {
      component: 'Column',
      gap: 4,
      children: [
        { component: 'Text', text: 'First' },
        { component: 'Text', text: 'Second' },
        { component: 'Text', text: 'Third' },
      ],
    }),

    entry('Card (nested)', {
      component: 'Card',
      title: 'Inner card',
      subtitle: 'Cards can contain anything, including more cards.',
      child: { component: 'Text', text: 'Body text inside a nested card.' },
    }),

    entry('Divider', {
      component: 'Column',
      gap: 8,
      children: [
        { component: 'Text', text: 'Above' },
        { component: 'Divider' },
        { component: 'Text', text: 'Below' },
      ],
    }),

    entry('List', {
      component: 'List',
      gap: 4,
      maxHeight: 120,
      children: [
        { component: 'Text', text: 'Item 1' },
        { component: 'Text', text: 'Item 2' },
        { component: 'Text', text: 'Item 3' },
        { component: 'Text', text: 'Item 4' },
        { component: 'Text', text: 'Item 5' },
      ],
    }),

    entry('Tabs', {
      component: 'Tabs',
      defaultValue: 'Overview',
      tabs: [
        { title: 'Overview', child: { component: 'Text', text: 'Overview tab content.' } },
        { title: 'Details',  child: { component: 'Text', text: 'Details tab content.' } },
        { title: 'Settings', child: { component: 'Text', text: 'Settings tab content.' } },
      ],
    }),

    // Modal needs a writable open state. We use a local store path that the
    // trigger button toggles via `showcase.setStore`; the Modal binds to it
    // through DataBinding and writes back `false` on close (writeDynamic).
    entry('Modal', {
      component: 'Column',
      gap: 8,
      children: [
        {
          component: 'Button',
          label: 'Open modal',
          variant: 'primary',
          onClick: {
            functionCall: {
              call: 'showcase.setStore',
              args: { path: '$/showcase/catalog/modalOpen', value: true },
            },
          },
        },
        {
          component: 'Modal',
          title: 'Hello, world',
          open: { path: '$/showcase/catalog/modalOpen' },
          dismissable: true,
          child: {
            component: 'Column',
            gap: 8,
            children: [
              { component: 'Text', text: 'This is a Modal example.' },
              { component: 'Text', text: 'Click the × in the header or the backdrop to close.', muted: true, variant: 'caption' },
            ],
          },
        },
      ],
    }),
  ],
};
