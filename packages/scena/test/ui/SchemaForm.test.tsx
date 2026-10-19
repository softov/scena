// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { SchemaForm, type JsonEditorProps } from '../../src/ui/forms/SchemaForm.js';
import { fieldsView, jsonView, type SchemaFormViewProps } from '../../src/ui/forms/views.js';
import { sectionsView } from '../../src/ui/forms/SectionsView.js';

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

  it('draws a view it is given, through the form\'s own fields, beside fields and json', () => {
    const seen: unknown[] = [];
    function Pair({ keys, renderField, value, onChange }: SchemaFormViewProps) {
      return (
        <div data-testid="pair">
          <span data-testid="count">{keys.length}</span>
          {renderField('name')}
          <button type="button" onClick={() => onChange({ ...value, name: 'from view' })}>fill</button>
        </div>
      );
    }
    render(
      <SchemaForm
        schema={{ type: 'object', properties: { name: { type: 'string', title: 'Name' }, age: { type: 'number' } } }}
        value={{ name: 'a' }}
        onChange={(next) => seen.push(next)}
        views={[fieldsView, jsonView, { id: 'pair', label: 'pair', render: Pair }]}
      />,
    );
    expect(screen.getAllByRole('button').map((one) => one.textContent)).toEqual(['fields', 'json', 'pair']);
    fireEvent.click(screen.getByRole('button', { name: 'pair' }));
    expect(screen.getByTestId('count').textContent).toBe('2');
    expect((screen.getByLabelText(/Name/) as HTMLInputElement).value).toBe('a');
    fireEvent.click(screen.getByRole('button', { name: 'fill' }));
    expect(seen.at(-1)).toEqual({ name: 'from view' });
  });

  it('draws no field actions unless asked', () => {
    render(<SchemaForm schema={{ type: 'object', properties: { name: { type: 'string' } } }} value={{ name: 'a' }} onChange={() => {}} />);
    expect(screen.queryByRole('button', { name: 'Setting actions' })).toBeNull();
    expect(screen.queryByRole('tooltip')).toBeNull();
  });

  it('shows a field\'s key, resets it out of the value, copies it, and shows the JSON', () => {
    const seen: Record<string, unknown>[] = [];
    const written: string[] = [];
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: (text: string) => { written.push(text); return Promise.resolve(); } } });
    const schema = { type: 'object' as const, properties: { closedChats: { type: 'string' as const, title: 'Closed chats', default: 'hidden' } } };
    const { rerender } = render(<SchemaForm schema={schema} value={{ closedChats: 'delete' }} onChange={(next) => seen.push(next)} fieldActions />);
    expect(screen.getByRole('tooltip').textContent).toBe('closedChats');
    const gear = screen.getByRole('button', { name: 'Setting actions' });
    expect(gear.getAttribute('aria-describedby')).toBe(screen.getByRole('tooltip').id);

    fireEvent.click(gear);
    fireEvent.click(screen.getByRole('menuitem', { name: 'Copy setting ID' }));
    expect(written).toEqual(['closedChats']);

    fireEvent.click(gear);
    fireEvent.click(screen.getByRole('menuitem', { name: 'Copy setting as JSON' }));
    expect(written.at(-1)).toBe('"closedChats": "delete"');

    fireEvent.click(gear);
    fireEvent.click(screen.getByRole('menuitem', { name: 'Reset setting' }));
    expect(seen.at(-1)).toEqual({});

    rerender(<SchemaForm schema={schema} value={{}} onChange={(next) => seen.push(next)} fieldActions />);
    fireEvent.click(screen.getByRole('button', { name: 'Setting actions' }));
    expect((screen.getByRole('menuitem', { name: 'Reset setting' }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole('menuitem', { name: 'Show in JSON' }));
    expect(document.querySelector('textarea.oo-schema-form__json')).not.toBeNull();
  });

  describe('sections view', () => {
    const schema = {
      type: 'object' as const,
      properties: {
        closedChats: { type: 'string' as const, title: 'Closed chats', description: 'What closing one chat does.' },
        port: { type: 'number' as const, title: 'Port' },
        wire: { type: 'string' as const, title: 'Wire log' },
        brandNew: { type: 'boolean' as const, title: 'Brand new' },
      },
    };
    const groups = [
      { id: 'daemon', title: 'Daemon', sections: [
        { id: 'sessions', title: 'Sessions', keys: ['closedChats', 'gone'] },
        { id: 'listener', title: 'Listener', keys: ['port'] },
      ] },
      { id: 'host', title: 'Host', sections: [{ id: 'limits', title: 'Limits', keys: ['wire'] }] },
    ];
    const draw = (value: Record<string, unknown>, onChange: (next: Record<string, unknown>) => void = () => {}) => (
      <SchemaForm schema={schema} value={value} baseline={{ closedChats: 'hidden', port: 9187, wire: '' }} onChange={onChange} views={[fieldsView, jsonView, sectionsView(groups)]} defaultView="sections" />
    );
    const tree = () => screen.getByRole('navigation', { name: 'Sections' });

    it('opens on the first section and draws only its keys', () => {
      render(draw({ closedChats: 'hidden', port: 9187, wire: '' }));
      expect(screen.getByRole('heading', { level: 2 }).textContent).toBe('Sessions');
      expect(screen.getByLabelText(/Closed chats/)).toBeTruthy();
      expect(screen.queryByLabelText(/Port/)).toBeNull();
    });

    it('lists a key no section names under Other, and leaves out a key the schema lacks', () => {
      render(draw({ closedChats: 'hidden', port: 9187, wire: '' }));
      fireEvent.click(within(tree()).getAllByRole('button', { name: /Other/ })[1]!);
      expect(screen.getByLabelText(/Brand new/)).toBeTruthy();
      expect(within(tree()).queryByRole('button', { name: /gone/ })).toBeNull();
    });

    it('draws every section of a chosen group under its title', () => {
      render(draw({ closedChats: 'hidden', port: 9187, wire: '' }));
      fireEvent.click(within(tree()).getByRole('button', { name: /Daemon/ }));
      expect(screen.getAllByRole('heading', { level: 3 }).map((one) => one.textContent)).toEqual(['Sessions', 'Listener']);
    });

    it('finds a field by its key across sections', () => {
      render(draw({ closedChats: 'hidden', port: 9187, wire: '' }));
      fireEvent.change(screen.getByRole('searchbox', { name: 'Search settings' }), { target: { value: 'wire' } });
      expect(screen.getByRole('heading', { level: 2 }).textContent).toBe('Search results');
      expect(screen.getByLabelText(/Wire log/)).toBeTruthy();
      expect(screen.queryByLabelText(/Closed chats/)).toBeNull();
    });

    it('narrows the tree to what a search finds, with counts, and a node scopes the results without leaving the search', () => {
      render(draw({ closedChats: 'hidden', port: 9187, wire: '' }));
      const search = screen.getByRole('searchbox', { name: 'Search settings' }) as HTMLInputElement;
      fireEvent.change(search, { target: { value: 'o' } });
      // closedChats ("one chat does"), port, wire log ("log"), brandNew: "o" is in Closed, Port, Wire log, and not in Brand new.
      expect(screen.getByRole('status').textContent).toBe('3 settings found');
      const names = within(tree()).getAllByRole('button').map((one) => one.textContent);
      expect(names).toEqual(['▾Daemon2', 'Sessions1', 'Listener1', '▾Host1', 'Limits1']);

      fireEvent.click(within(tree()).getByRole('button', { name: /Listener/ }));
      expect(search.value).toBe('o');
      expect(screen.getByRole('heading', { level: 2 }).textContent).toBe('Daemon › Listener');
      expect(screen.getByLabelText(/Port/)).toBeTruthy();
      expect(screen.queryByLabelText(/Closed chats/)).toBeNull();

      fireEvent.click(within(tree()).getByRole('button', { name: /Listener/ }));
      expect(screen.getByRole('heading', { level: 2 }).textContent).toBe('Search results');
      expect(screen.getByLabelText(/Closed chats/)).toBeTruthy();
    });

    it('marks a section whose keys differ from the baseline', () => {
      render(draw({ closedChats: 'delete', port: 9187, wire: '' }));
      expect(within(within(tree()).getByRole('button', { name: /Sessions/ })).getByTitle('Edited')).toBeTruthy();
      expect(within(within(tree()).getByRole('button', { name: /Listener/ })).queryByTitle('Edited')).toBeNull();
    });
  });

  it('opens on the view it is told to', () => {
    render(
      <SchemaForm schema={{ type: 'object', properties: { name: { type: 'string' } } }} value={{ name: 'a' }} onChange={() => {}} defaultView="json" />,
    );
    expect(document.querySelector('textarea.oo-schema-form__json')).not.toBeNull();
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
