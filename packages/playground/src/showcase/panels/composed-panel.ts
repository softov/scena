import type { ComponentNode } from '@softov/scena/types';

// Composed examples — realistic compositions built from the catalog.
// No new primitives invented; just the building blocks combined.

const contactCard: ComponentNode = {
  component: 'Card',
  child: {
    component: 'Column',
    gap: 8,
    children: [
      { component: 'Text', text: 'Sarah Johnson', variant: 'h2' },
      { component: 'Text', text: 'Product Manager', variant: 'caption', muted: true },
      { component: 'Divider' },
      {
        component: 'Row',
        gap: 8,
        align: 'center',
        children: [
          { component: 'Icon', name: '✉', size: 14 },
          { component: 'Text', text: 'sarah@company.com' },
        ],
      },
      {
        component: 'Row',
        gap: 8,
        align: 'center',
        children: [
          { component: 'Icon', name: '☎', size: 14 },
          { component: 'Text', text: '+1 (555) 123-4567' },
        ],
      },
      {
        component: 'Row',
        gap: 8,
        children: [
          {
            component: 'Button',
            label: 'Send email',
            variant: 'primary',
            onClick: {
              event: {
                name: 'composed:contact:email',
                context: { id: 'sarah' },
              },
            },
          },
          {
            component: 'Button',
            label: 'Call',
            onClick: {
              event: {
                name: 'composed:contact:call',
                context: { id: 'sarah' },
              },
            },
          },
        ],
      },
    ],
  },
};

const dashboardCards: ComponentNode = {
  component: 'Column',
  gap: 12,
  children: [
    { component: 'Text', text: 'Q4 Analytics', variant: 'h2' },
    {
      component: 'Row',
      gap: 12,
      children: [
        {
          component: 'Card',
          child: {
            component: 'Column',
            gap: 4,
            children: [
              { component: 'Text', text: 'Revenue', variant: 'caption', muted: true },
              { component: 'Text', text: '$125,400', variant: 'h2' },
            ],
          },
        },
        {
          component: 'Card',
          child: {
            component: 'Column',
            gap: 4,
            children: [
              { component: 'Text', text: 'Users', variant: 'caption', muted: true },
              { component: 'Text', text: '8,392', variant: 'h2' },
            ],
          },
        },
        {
          component: 'Card',
          child: {
            component: 'Column',
            gap: 4,
            children: [
              { component: 'Text', text: 'Growth', variant: 'caption', muted: true },
              { component: 'Text', text: '+23%', variant: 'h2' },
            ],
          },
        },
      ],
    },
    {
      component: 'Card',
      child: {
        component: 'Column',
        gap: 8,
        children: [
          { component: 'Text', text: 'Monthly target', variant: 'h3' },
          { component: 'Slider', min: 0, max: 100, defaultValue: 75, disabled: true, showValue: true, label: 'Progress' },
        ],
      },
    },
  ],
};

const loginForm: ComponentNode = {
  component: 'Card',
  title: 'Sign in',
  subtitle: 'No real auth — just demonstrates input + Action.event composition.',
  child: {
    component: 'Column',
    gap: 12,
    children: [
      {
        component: 'TextField',
        label: 'Username',
        defaultValue: '',
        placeholder: 'alice',
      },
      {
        component: 'TextField',
        label: 'Password',
        type: 'password',
        defaultValue: '',
        placeholder: '••••••••',
      },
      { component: 'CheckBox', label: 'Remember me', defaultValue: true },
      {
        component: 'Row',
        gap: 8,
        children: [
          {
            component: 'Button',
            label: 'Sign in',
            variant: 'primary',
            onClick: { event: { name: 'composed:login:submit' } },
          },
          {
            component: 'Button',
            label: 'Forgot password',
            variant: 'ghost',
            onClick: { event: { name: 'composed:login:forgot' } },
          },
        ],
      },
    ],
  },
};

export const composedPanelNode: ComponentNode = {
  component: 'Column',
  gap: 16,
  style: { padding: 16 },
  children: [
    { component: 'Text', text: 'Composed examples', variant: 'h1' },
    {
      component: 'Text',
      text: 'Same building blocks, real-ish compositions. Action.event fires emit on the scena bus.',
      muted: true,
    },
    contactCard,
    dashboardCards,
    loginForm,
  ],
};
