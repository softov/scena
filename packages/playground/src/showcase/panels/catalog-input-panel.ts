import type { ComponentNode } from '@softov/scena/types';

function entry(title: string, body: ComponentNode): ComponentNode {
  return { component: 'Card', title, child: body };
}

export const catalogInputPanelNode: ComponentNode = {
  component: 'Column',
  gap: 16,
  style: { padding: 16 },
  children: [
    { component: 'Text', text: 'Catalog — Input', variant: 'h1' },
    {
      component: 'Text',
      text: 'Button, TextField, CheckBox, ChoicePicker, Slider, DateTimeInput.',
      muted: true,
    },

    entry('Button variants', {
      component: 'Column',
      gap: 8,
      children: [
        {
          component: 'Row',
          gap: 8,
          children: [
            { component: 'Button', label: 'Default' },
            { component: 'Button', label: 'Primary', variant: 'primary' },
            { component: 'Button', label: 'Secondary', variant: 'secondary' },
            { component: 'Button', label: 'Danger', variant: 'danger' },
            { component: 'Button', label: 'Ghost', variant: 'ghost' },
            { component: 'Button', label: 'Borderless', variant: 'borderless' },
            { component: 'Button', label: 'Disabled', disabled: true },
          ] as ComponentNode['children'],
        },
        {
          component: 'Row',
          gap: 8,
          align: 'start',
          children: [
            { component: 'Button', label: 'xsmall', size: 'xs' },
            { component: 'Button', label: 'Small - sm', size: 'sm' },
            { component: 'Button', label: 'Medium - md', size: 'md' },
            { component: 'Button', label: 'Large - lg', size: 'lg' },
            // { component: 'Button', label: 'Size XL', size: 'xl' },
            // { component: 'Button', label: 'Size XXL', size: 'xxl' },
          ] as ComponentNode['children'],
        },
        {
          component: 'Row',
          gap: 8,
          align: 'start',
          children: [
            { component: 'Button', label: 'Weight 100', weight: 100 },
            { component: 'Button', label: 'Weight 200', weight: 200 },
            { component: 'Button', label: 'Weight 300', weight: 300 }
          ] as ComponentNode['children'],
        },
      ],
    }),

    entry('TextField', {
      component: 'Column',
      gap: 8,
      children: [
        {
          component: 'TextField',
          label: 'Short text',
          placeholder: 'Type something…',
          defaultValue: '',
        },
        {
          component: 'TextField',
          label: 'Multiline',
          multiline: true,
          rows: 3,
          placeholder: 'Tell us more…',
        },
        {
          component: 'TextField',
          label: 'Password',
          type: 'password',
          placeholder: '••••••••',
        },
      ],
    }),

    entry('CheckBox', {
      component: 'Column',
      gap: 4,
      children: [
        { component: 'CheckBox', label: 'Enable notifications', defaultValue: true },
        { component: 'CheckBox', label: 'Subscribe to newsletter', defaultValue: false },
      ],
    }),

    entry('ChoicePicker (select + radio)', {
      component: 'Row',
      gap: 24,
      children: [
        {
          component: 'ChoicePicker',
          label: 'Role',
          variant: 'select',
          options: [
            { label: 'Developer', value: 'dev' },
            { label: 'Designer', value: 'design' },
            { label: 'PM', value: 'pm' },
          ],
          defaultValue: 'dev',
          value: {
            path: '$/showcase/role',
          },
        },
        {
          component: 'ChoicePicker',
          label: 'Role',
          variant: 'radio',
          options: [
            { label: 'Developer', value: 'dev' },
            { label: 'Designer', value: 'design' },
            { label: 'PM', value: 'pm' },
          ],
          value: {
            path: '$/showcase/role',
          },
        },
        {
          component: 'ChoicePicker',
          label: 'Tier',
          variant: 'radio',
          options: ['Free', 'Pro', 'Enterprise'],
          defaultValue: 'Free',
        },
      ],
    }),

    entry('Slider', {
      component: 'Column',
      children: [
        {
          component: 'Slider',
          label: 'Volume',
          min: 0,
          max: 100,
          step: 1,
          defaultValue: 35,
          style: {
            accentColor: 'var(--oo-color-accent)',
          },
          value: {
            path: '$/showcase/sliderValue',
          },
        },
        {
          component: 'TextField',
          label: 'Value',
          type: 'number',
          min: 0,
          max: 100,
          value: {
            path: '$/showcase/sliderValue',
          },
          placeholder: '0-100',
        },
      ],
    }),

    entry('DateTimeInput', {
      component: 'Row',
      gap: 12,
      children: [
        { component: 'DateTimeInput', label: 'Date', mode: 'date' },
        { component: 'DateTimeInput', label: 'Time', mode: 'time' },
        { component: 'DateTimeInput', label: 'Datetime', mode: 'datetime' },
      ],
    }),
  ],
};
