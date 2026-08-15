// @vitest-environment jsdom

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SchemaForm } from '../../src/ui/forms/SchemaForm.js';

describe('SchemaForm', () => {
  it('renders the root schema description as Markdown without adding form data', () => {
    const value = { token: '' };
    render(
      <SchemaForm
        schema={{
          type: 'object',
          description: '## Setup help\n\nUse the **Phone Number ID**, not the WABA ID.',
          properties: { token: { type: 'string', title: 'Token' } },
        }}
        value={value}
        onChange={() => {}}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Setup help' })).toBeTruthy();
    expect(screen.getByText('Phone Number ID')).toBeTruthy();
    expect(value).toEqual({ token: '' });
  });
});
