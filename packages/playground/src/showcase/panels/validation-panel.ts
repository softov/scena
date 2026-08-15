import type { ComponentNode } from '@softov/scena/types';

// Validation demo. Each TextField writes to `$/showcase/signup/*` (writeDynamic),
// and `checks` runs the a2ui basic-catalog functions synchronously through the
// dynamic resolver. Failed conditions surface as messages under the field.

function field(
  label: string,
  path: string,
  checks: ComponentNode['checks'],
  extra: Record<string, unknown> = {},
): ComponentNode {
  return {
    component: 'TextField',
    label,
    value: { path },
    checks,
    ...extra,
  };
}

export const validationPanelNode: ComponentNode = {
  component: 'Column',
  gap: 12,
  style: { padding: 16 },
  children: [
    { component: 'Text', text: 'Form with checks', variant: 'h1' },
    {
      component: 'Text',
      text: 'Each Check.condition is a FunctionCall against a built-in (required / email / length / regex). The dynamic resolver runs them synchronously and the Checks helper renders failed messages.',
      muted: true,
    },
    {
      component: 'Card',
      title: 'Create account',
      child: {
        component: 'Column',
        gap: 12,
        children: [
          field('Full name', '$/showcase/signup/name', [
            {
              condition: { call: 'required', args: { value: { path: '$/showcase/signup/name' } } },
              message: 'Name is required.',
            },
            {
              condition: { call: 'length', args: { value: { path: '$/showcase/signup/name' }, min: 2 } },
              message: 'Name must be at least 2 characters.',
            },
          ], { placeholder: 'Ada Lovelace' }),

          field('Email', '$/showcase/signup/email', [
            {
              condition: { call: 'required', args: { value: { path: '$/showcase/signup/email' } } },
              message: 'Email is required.',
            },
            {
              condition: { call: 'email', args: { value: { path: '$/showcase/signup/email' } } },
              message: 'Not a valid email address.',
            },
          ], { placeholder: 'ada@analytical.engine', type: 'email' }),

          field('Password', '$/showcase/signup/password', [
            {
              condition: { call: 'length', args: { value: { path: '$/showcase/signup/password' }, min: 8 } },
              message: 'Password must be at least 8 characters.',
            },
            {
              condition: {
                call: 'regex',
                args: {
                  value: { path: '$/showcase/signup/password' },
                  pattern: '[A-Z]',
                },
              },
              message: 'Must contain an uppercase letter.',
            },
            {
              condition: {
                call: 'regex',
                args: {
                  value: { path: '$/showcase/signup/password' },
                  pattern: '[0-9]',
                },
              },
              message: 'Must contain a digit.',
            },
          ], { type: 'password' }),

          {
            component: 'CheckBox',
            label: 'I agree to the terms',
            value: { path: '$/showcase/signup/agree' },
            checks: [
              {
                condition: { path: '$/showcase/signup/agree' },
                message: 'You must agree to continue.',
              },
            ],
          },

          {
            component: 'Button',
            label: 'Submit',
            variant: 'primary',
            onClick: { event: { name: 'showcase:signup:submit' } },
          },
        ],
      },
    },
  ],
};
