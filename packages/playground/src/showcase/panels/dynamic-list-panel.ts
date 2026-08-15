import type { ComponentNode } from '@softov/scena/types';

// DynamicChildList demo. Exercises in one shot:
//   - TextField writeDynamic into `$/showcase/filter`
//   - store.computed → `$/showcase/users/visible` derived from the raw
//     list + filter (registered in showcase/register.ts)
//   - List { template, path } iteration with per-item data context
//   - Relative paths inside the template (`/name`, `/email`, `/team`)
//   - Action.functionCall with DataBinding args (the Open button)

export const dynamicListPanelNode: ComponentNode = {
  component: 'Column',
  gap: 12,
  style: { padding: 16 },
  children: [
    { component: 'Text', text: 'Dynamic list + filter', variant: 'h1' },
    {
      component: 'Text',
      text: 'Type to filter. The list re-derives via a computed path; the template is one Card per item.',
      muted: true,
    },
    {
      component: 'TextField',
      label: 'Filter users (name or email)',
      value: { path: '$/showcase/filter' },
      placeholder: 'Try "ada" or "research"…',
    },
    {
      component: 'List',
      gap: 8,
      maxHeight: 480,
      children: {
        path: '$/showcase/users/visible',
        template: {
          component: 'Card',
          child: {
            component: 'Column',
            gap: 4,
            children: [
              {
                component: 'Row',
                gap: 8,
                align: 'center',
                justify: 'spaceBetween',
                children: [
                  { component: 'Text', text: { path: '/name' }, weight: 'bold' },
                  { component: 'Text', text: { path: '/team' }, muted: true, variant: 'caption' },
                ],
              },
              { component: 'Text', text: { path: '/email' }, muted: true },
              {
                component: 'Button',
                label: 'Open user (dispatches users.open)',
                variant: 'primary',
                onClick: {
                  functionCall: {
                    call: 'users.open',
                    args: { 
                      userId: { path: '/id' }
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
