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

  it('renders a field description as Markdown in the hint', () => {
    const { container } = render(
      <SchemaForm
        schema={{
          type: 'object',
          properties: {
            token: {
              type: 'string',
              title: 'Bot Token',
              description: '\n**Authentication**:\n\n1. Talk to the [Botfather](https://telegram.me/BotFather).\n2. Type in "/newbot"',
            },
            name: { type: 'string', description: 'What the list shows.' },
          },
        }}
        value={{}}
        onChange={() => {}}
      />,
    );

    expect(screen.getByText('Authentication').tagName).toBe('STRONG');
    expect(container.querySelectorAll('.oo-field__hint ol > li')).toHaveLength(2);
    expect(screen.getByRole('link', { name: 'Botfather' }).getAttribute('href')).toBe('https://telegram.me/BotFather');
    expect(screen.getByText('What the list shows.').tagName).toBe('P');
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

  it('gives a nested field its actions, with its dotted path as the ID', () => {
    const seen: Record<string, unknown>[] = [];
    const written: string[] = [];
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: (text: string) => { written.push(text); return Promise.resolve(); } } });
    const schema = { type: 'object' as const, properties: { machine: { type: 'object' as const, properties: { part: { type: 'string' as const }, state: { type: 'string' as const } } } } };
    render(<SchemaForm schema={schema} value={{ machine: { part: 'claude', state: '/home/agent' } }} onChange={(next) => seen.push(next)} fieldActions />);
    expect(screen.getAllByRole('tooltip').map((tip) => tip.textContent)).toEqual(['machine', 'machine.part', 'machine.state']);

    const part = screen.getAllByRole('button', { name: 'Setting actions' })[1]!;
    fireEvent.click(part);
    fireEvent.click(screen.getByRole('menuitem', { name: 'Copy setting ID' }));
    expect(written).toEqual(['machine.part']);

    fireEvent.click(part);
    fireEvent.click(screen.getByRole('menuitem', { name: 'Copy setting as JSON' }));
    expect(written.at(-1)).toBe('"part": "claude"');

    fireEvent.click(part);
    fireEvent.click(screen.getByRole('menuitem', { name: 'Reset setting' }));
    expect(seen.at(-1)).toEqual({ machine: { state: '/home/agent' } });
  });

  it('copies through a selected text box when the page has no clipboard API', () => {
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: undefined });
    const copied: string[] = [];
    Object.defineProperty(document, 'execCommand', {
      configurable: true,
      value: (command: string) => {
        copied.push(`${command}:${document.querySelector<HTMLTextAreaElement>('textarea[readonly]')?.value}`);
        return true;
      },
    });
    render(<SchemaForm schema={{ type: 'object', properties: { name: { type: 'string' } } }} value={{ name: 'a' }} onChange={() => {}} fieldActions />);
    fireEvent.click(screen.getByRole('button', { name: 'Setting actions' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Copy setting ID' }));
    expect(copied).toEqual(['copy:name']);
    expect(document.querySelector('textarea[readonly]')).toBeNull();
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

  describe('conditions', () => {
    /** A row whose kind narrows its limits' measures and its match's keys, as ahpd's `policy:` manifest does. */
    const lines = { type: 'array', items: { type: 'string' } };
    const narrow = (kind: string, measures: string[], matches: string[]) => ({
      if: { properties: { kind: { const: kind } }, required: ['kind'] },
      then: { properties: { limits: { items: { properties: { measure: { enum: measures } } } }, match: { propertyNames: { enum: matches } } } },
    });
    const policy = {
      type: 'object',
      properties: {
        kind: { type: 'string', title: 'Kind', enum: ['model', 'agent'] },
        match: { type: 'object', title: 'Match', properties: { model: { ...lines, title: 'Models' }, proxy: { ...lines, title: 'Proxies' }, agent: { ...lines, title: 'Agents' } } },
        limits: { type: 'array', title: 'Limits', items: { type: 'object', properties: { measure: { type: 'string', title: 'Measure', enum: ['usd', 'tokens', 'turns'] } } } },
      },
      required: ['kind'],
      allOf: [narrow('model', ['usd', 'tokens'], ['model', 'proxy']), narrow('agent', ['usd', 'turns'], ['agent'])],
    };
    const optionsOf = (label: RegExp): string[] =>
      Array.from((screen.getByLabelText(label) as HTMLSelectElement).options).map((option) => option.value).filter((value) => value !== '');

    it('draws what the chosen kind takes, and redraws when the kind changes', () => {
      render(<SchemaForm schema={policy} value={{ kind: 'agent', match: {}, limits: [{ measure: 'usd' }] }} onChange={() => {}} />);
      expect(screen.getByText('Agents')).toBeTruthy();
      expect(screen.queryByText('Models')).toBeNull();
      expect(optionsOf(/Measure/)).toEqual(['usd', 'turns']);

      fireEvent.change(screen.getByLabelText(/Kind/), { target: { value: 'model' } });
      expect(screen.getByText('Models')).toBeTruthy();
      expect(screen.getByText('Proxies')).toBeTruthy();
      expect(screen.queryByText('Agents')).toBeNull();
      expect(optionsOf(/Measure/)).toEqual(['usd', 'tokens']);
    });

    it('draws every field while no kind is chosen', () => {
      render(<SchemaForm schema={policy} value={{ match: {} }} onChange={() => {}} />);
      for (const title of ['Models', 'Proxies', 'Agents']) expect(screen.getByText(title)).toBeTruthy();
    });

    it('keeps what the kind no longer takes on screen, marked, until it is taken out', () => {
      render(<SchemaForm schema={policy} value={{ kind: 'agent', match: { proxy: ['openai'] }, limits: [{ measure: 'tokens' }] }} onChange={() => {}} />);
      expect(screen.getByText('Proxies')).toBeTruthy();
      expect(screen.getByText(/Not allowed here/)).toBeTruthy();
      expect((screen.getByLabelText(/Measure/) as HTMLSelectElement).value).toBe('tokens');
      expect(screen.getByText(/Not one of the choices/)).toBeTruthy();
    });

    it('takes a key the kind does not allow out of the value once it is emptied', () => {
      const seen: Record<string, unknown>[] = [];
      render(<SchemaForm schema={policy} value={{ kind: 'agent', match: { proxy: ['openai'] } }} onChange={(next) => seen.push(next)} />);
      fireEvent.click(screen.getByRole('button', { name: 'Remove item' }));
      expect(seen.at(-1)).toEqual({ kind: 'agent', match: {} });
      expect(screen.queryByText('Proxies')).toBeNull();
    });
  });
  describe('maps', () => {
    const REFERENCE = (keyword: string) => ({
      type: 'object',
      properties: { [keyword]: { type: 'string' } },
      required: [keyword],
      additionalProperties: false as const,
    });
    const ENV = {
      type: 'object',
      properties: {
        env: {
          type: 'object',
          title: 'env',
          additionalProperties: { oneOf: [{ type: 'string' }, { type: 'null' }, REFERENCE('fromEnv'), REFERENCE('$secret')] },
        },
      },
    };

    /** A form that keeps its own value, and reports each one. */
    function Held({ schema, start, seen }: { schema: object; start: Record<string, unknown>; seen: Record<string, unknown>[] }) {
      return <SchemaForm schema={schema} defaultValue={start} onChange={(next) => seen.push(next)} jsonTextRoot={false} />;
    }

    it('draws each key of a map as a name and a value, with the branch its value fits', () => {
      const seen: Record<string, unknown>[] = [];
      render(<Held schema={ENV} start={{ env: { BASE: 'https://a', OFF: null, KEY: { fromEnv: 'MY_KEY' } } }} seen={seen} />);
      expect(screen.queryByText('No parameters defined.')).toBeNull();
      const names = screen.getAllByPlaceholderText('Name') as HTMLInputElement[];
      expect(names.map((one) => one.value)).toEqual(['BASE', 'OFF', 'KEY', '']);
      const pickers = screen.getAllByRole('combobox') as HTMLSelectElement[];
      expect(pickers.map((one) => one.selectedOptions[0]?.textContent)).toEqual(['string', 'null', '{ fromEnv }']);
      expect((screen.getByDisplayValue('MY_KEY') as HTMLInputElement).value).toBe('MY_KEY');
    });

    it('edits a value, renames a key in place, and removes a row', () => {
      const seen: Record<string, unknown>[] = [];
      render(<Held schema={ENV} start={{ env: { A: '1', B: '2' } }} seen={seen} />);
      fireEvent.change(screen.getByDisplayValue('2'), { target: { value: '3' } });
      expect(seen.at(-1)).toEqual({ env: { A: '1', B: '3' } });
      fireEvent.change(screen.getByDisplayValue('A'), { target: { value: 'C' } });
      expect(Object.keys(seen.at(-1)!.env as object)).toEqual(['C', 'B']);
      fireEvent.click(screen.getByRole('button', { name: 'Remove B' }));
      expect(seen.at(-1)).toEqual({ env: { C: '1' } });
    });

    it('does not rename onto a name another row has, and says so', () => {
      const seen: Record<string, unknown>[] = [];
      render(<Held schema={ENV} start={{ env: { A: '1', B: '2' } }} seen={seen} />);
      fireEvent.change(screen.getByDisplayValue('B'), { target: { value: 'A' } });
      expect(seen).toEqual([]);
      expect(screen.getByText('That name is taken.')).toBeTruthy();
    });

    it('adds a row from a typed name, with the first branch\'s value', () => {
      const seen: Record<string, unknown>[] = [];
      render(<Held schema={ENV} start={{}} seen={seen} />);
      const add = screen.getByRole('button', { name: '+ add' }) as HTMLButtonElement;
      expect(add.disabled).toBe(true);
      fireEvent.change(screen.getByPlaceholderText('Name'), { target: { value: 'TOKEN' } });
      fireEvent.click(add);
      expect(seen.at(-1)).toEqual({ env: { TOKEN: '' } });
    });

    it('draws a value of any JSON shape as JSON text', () => {
      const seen: Record<string, unknown>[] = [];
      const schema = { type: 'object', properties: { extraArgs: { type: 'object', additionalProperties: {} } } };
      render(<Held schema={schema} start={{ extraArgs: { settings: { allow: ['Read'] }, verbose: null } }} seen={seen} />);
      const box = screen.getByDisplayValue((text) => text.includes('"allow"')) as HTMLTextAreaElement;
      fireEvent.change(box, { target: { value: '{ "allow": ["Write"] }' } });
      expect(seen.at(-1)).toEqual({ extraArgs: { settings: { allow: ['Write'] }, verbose: null } });
      fireEvent.change(screen.getAllByPlaceholderText('Name').at(-1)!, { target: { value: 'debug' } });
      fireEvent.click(screen.getByRole('button', { name: '+ add' }));
      expect((seen.at(-1)!.extraArgs as Record<string, unknown>).debug).toBeNull();
    });

    it('keeps the named keys as fields and the others as rows', () => {
      const seen: Record<string, unknown>[] = [];
      const schema = { type: 'object', properties: { name: { type: 'string', title: 'Name field' } }, additionalProperties: { type: 'string' } };
      render(<Held schema={schema} start={{ name: 'n', extra: 'x' }} seen={seen} />);
      const names = screen.getAllByPlaceholderText('Name') as HTMLInputElement[];
      expect(names.map((one) => one.value)).toEqual(['extra', '']);
    });

    /** A consumer's own view: the value as text, with no fields. */
    const rawView = {
      id: 'raw',
      label: 'raw',
      render: ({ value }: SchemaFormViewProps) => <pre data-testid="raw">{JSON.stringify(value)}</pre>,
    };

    it('offers a view given at the root on a nested section too', () => {
      render(
        <SchemaForm
          schema={{ type: 'object', properties: { name: { type: 'string' }, env: { type: 'object', title: 'env', additionalProperties: { type: 'string' } } } }}
          value={{ name: 'a', env: { HOME: '/h' } }}
          onChange={() => {}}
          views={[fieldsView, jsonView, rawView]}
        />,
      );
      const raws = screen.getAllByRole('button', { name: 'raw' });
      expect(raws).toHaveLength(2);
      fireEvent.click(raws[1]!);
      expect(screen.getByTestId('raw').textContent).toBe('{"HOME":"/h"}');
      expect(screen.getByLabelText(/name/)).toBeTruthy();
    });

    it('draws the rows only in the fields view, not under another view', () => {
      render(
        <SchemaForm
          schema={{ type: 'object', additionalProperties: { type: 'string' } }}
          value={{ A: '1' }}
          onChange={() => {}}
          views={[fieldsView, jsonView, rawView]}
          defaultView="raw"
        />,
      );
      expect(screen.getByTestId('raw').textContent).toBe('{"A":"1"}');
      expect(screen.queryAllByPlaceholderText('Name')).toHaveLength(0);
      expect(screen.queryByRole('button', { name: 'Remove A' })).toBeNull();
      fireEvent.click(screen.getByRole('button', { name: 'fields' }));
      expect(screen.getByRole('button', { name: 'Remove A' })).toBeTruthy();
    });
  });
});
