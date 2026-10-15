// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { SchemaForm, type JsonEditorProps } from '../../src/ui/forms/SchemaForm.js';

/** A stand-in for a consumer's code editor: a text box under a test id. */
function TestEditor({ value, onChange }: JsonEditorProps) {
  return <input data-testid="json-editor" value={value} onChange={(event) => onChange(event.currentTarget.value)} />;
}

describe('SchemaForm', () => {
  afterEach(cleanup);

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

  it('writes its JSON in the editor it is given, and a parsed edit reaches onChange', () => {
    const seen: unknown[] = [];
    const { container } = render(
      <SchemaForm
        schema={{ type: 'object', properties: { name: { type: 'string' } } }}
        value={{ name: 'a' }}
        onChange={(next) => seen.push(next)}
        jsonEditor={TestEditor}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'json' }));

    const editor = screen.getByTestId('json-editor') as HTMLInputElement;
    expect(JSON.parse(editor.value)).toEqual({ name: 'a' });
    expect(container.querySelector('textarea')).toBeNull();
    fireEvent.change(editor, { target: { value: '{"name":"b"}' } });
    expect(seen).toEqual([{ name: 'b' }]);
  });

  it('keeps the textarea when no editor is given', () => {
    const { container } = render(
      <SchemaForm schema={{ type: 'object', properties: { name: { type: 'string' } } }} value={{ name: 'a' }} onChange={() => {}} />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'json' }));
    expect(container.querySelector('textarea.oo-schema-form__json')).not.toBeNull();
  });

  it('hands the editor to a nested section and to a tuple array', () => {
    render(
      <SchemaForm
        schema={{
          type: 'object',
          properties: {
            inner: { type: 'object', properties: { on: { type: 'boolean' } } },
            pair: { type: 'array', items: [{ type: 'string' }, { type: 'number' }] } as never,
          },
        }}
        value={{ inner: { on: true }, pair: ['x', 1] }}
        onChange={() => {}}
        jsonEditor={TestEditor}
      />,
    );
    expect(JSON.parse((screen.getByTestId('json-editor') as HTMLInputElement).value)).toEqual(['x', 1]);
    const toggles = screen.getAllByRole('button', { name: 'json' });
    fireEvent.click(toggles[1]!);
    expect(screen.getAllByTestId('json-editor')).toHaveLength(2);
  });

  it('reports JSON that does not parse, shows why, and reports again once it parses', () => {
    const valid: boolean[] = [];
    const seen: unknown[] = [];
    render(
      <SchemaForm
        schema={{ type: 'object', properties: { name: { type: 'string' } } }}
        value={{ name: 'a' }}
        onChange={(next) => seen.push(next)}
        jsonEditor={TestEditor}
        onJsonValidChange={(next) => valid.push(next)}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'json' }));
    const editor = screen.getByTestId('json-editor');

    fireEvent.change(editor, { target: { value: '{"name": "b" "x": 1}' } });
    expect(valid).toEqual([true, false]);
    expect(screen.getByRole('alert').textContent).toMatch(/JSON/);
    expect(seen).toEqual([]);

    fireEvent.change(editor, { target: { value: '[1]' } });
    expect(screen.getByRole('alert').textContent).toBe('The JSON must be an object.');

    fireEvent.change(editor, { target: { value: '{"name": "b"}' } });
    expect(valid).toEqual([true, false, true]);
    expect(screen.queryByRole('alert')).toBeNull();
    expect(seen).toEqual([{ name: 'b' }]);
  });

  it('is valid again when it goes back to the fields, which show the last value that parsed', () => {
    const valid: boolean[] = [];
    render(
      <SchemaForm
        schema={{ type: 'object', properties: { name: { type: 'string' } } }}
        value={{ name: 'a' }}
        onChange={() => {}}
        onJsonValidChange={(next) => valid.push(next)}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'json' }));
    fireEvent.change(document.querySelector('textarea.oo-schema-form__json')!, { target: { value: '{' } });
    fireEvent.click(screen.getByRole('button', { name: 'fields' }));
    expect(valid).toEqual([true, false, true]);
  });

  it('counts a nested section and a tuple array whose JSON does not parse', () => {
    const valid: boolean[] = [];
    render(
      <SchemaForm
        schema={{
          type: 'object',
          properties: {
            inner: { type: 'object', properties: { on: { type: 'boolean' } } },
            pair: { type: 'array', items: [{ type: 'string' }, { type: 'number' }] } as never,
          },
        }}
        value={{ inner: { on: true }, pair: ['x', 1] }}
        onChange={() => {}}
        jsonEditor={TestEditor}
        onJsonValidChange={(next) => valid.push(next)}
      />,
    );
    const tuple = screen.getByTestId('json-editor');
    fireEvent.change(tuple, { target: { value: '["x",' } });
    expect(valid.at(-1)).toBe(false);
    fireEvent.change(tuple, { target: { value: '["y", 2]' } });
    expect(valid.at(-1)).toBe(true);

    fireEvent.click(screen.getAllByRole('button', { name: 'json' })[1]!);
    fireEvent.change(screen.getAllByTestId('json-editor')[0]!, { target: { value: '{"on": tru' } });
    expect(valid.at(-1)).toBe(false);
  });

  it('shows a value from outside in place of a JSON draft, as a consumer reset', () => {
    const valid: boolean[] = [];
    const schema = { type: 'object' as const, properties: { name: { type: 'string' as const } } };
    const { rerender } = render(
      <SchemaForm schema={schema} value={{ name: 'a' }} onChange={() => {}} jsonEditor={TestEditor} onJsonValidChange={(next) => valid.push(next)} />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'json' }));
    fireEvent.change(screen.getByTestId('json-editor'), { target: { value: '{"name": ' } });
    expect(valid.at(-1)).toBe(false);

    rerender(<SchemaForm schema={schema} value={{ name: 'z' }} onChange={() => {}} jsonEditor={TestEditor} onJsonValidChange={(next) => valid.push(next)} />);
    expect(JSON.parse((screen.getByTestId('json-editor') as HTMLInputElement).value)).toEqual({ name: 'z' });
    expect(screen.queryByRole('alert')).toBeNull();
    expect(valid.at(-1)).toBe(true);
  });

  it('keeps the JSON text as typed when its own value comes back', () => {
    const schema = { type: 'object' as const, properties: { name: { type: 'string' as const } } };
    let value: Record<string, unknown> = { name: 'a' };
    const { rerender } = render(<SchemaForm schema={schema} value={value} onChange={(next) => { value = next; }} jsonEditor={TestEditor} />);
    fireEvent.click(screen.getByRole('button', { name: 'json' }));
    fireEvent.change(screen.getByTestId('json-editor'), { target: { value: '{"name":"b"}' } });
    rerender(<SchemaForm schema={schema} value={value} onChange={(next) => { value = next; }} jsonEditor={TestEditor} />);
    expect((screen.getByTestId('json-editor') as HTMLInputElement).value).toBe('{"name":"b"}');
  });
});
