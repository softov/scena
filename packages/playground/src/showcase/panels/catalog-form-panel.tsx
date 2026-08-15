import { useState, type ReactNode } from 'react';
import type { BindingPath } from '@softov/scena/types';
import { useScena, useStore } from '@softov/scena/react';
import { Button, Form, SchemaForm, type FormatRendererProps, type JsonSchemaObject } from '@softov/scena/ui';
import './catalog-form-panel.css';

// Showcase for src/ui/forms. SchemaForm in BOTH data modes side by side:
//   left  · controlled (direct React): useState + onChange, like web-next Form.tsx
//   right · store-bound: value/onChange round-trip through the reactive store
//
// Also exercises the lifecycle bits: dirty tracking + reset against a baseline,
// `data-loading` async styling, and a record loader. Submitting one form loads
// its data into the OTHER (async), so both directions are visible at once.

const BOUND_PATH = '$/showcase/form' as BindingPath;
const LOAD_MS = 3500;

const DEMO_SCHEMA: JsonSchemaObject = {
  type: 'object',
  required: ['name'],
  properties: {
    name: { type: 'string', title: 'Name', description: 'Your display name' },
    role: { type: 'string', title: 'Role', enum: ['admin', 'editor', 'viewer'] },
    bio: { type: 'string', title: 'Bio', description: 'Short bio [textarea:3]' },
    notifications: { type: 'boolean', title: 'Email notifications' },
    maxTokens: { type: 'integer', title: 'Max tokens', minimum: 1, maximum: 200000 },
    favoriteColor: { type: 'string', title: 'Favorite color', format: 'color' },
    tags: { type: 'array', title: 'Tags', items: { type: 'string' } },
    advanced: {
      type: 'object',
      title: 'Advanced',
      'x-header': true,
      properties: {
        temperature: { type: 'number', title: 'Temperature', minimum: 0, maximum: 2 },
        retries: { type: 'integer', title: 'Retries' },
      },
    },
    hasSecret: { type: 'boolean', title: 'Has API key?' },
    apiKey: {
      type: 'string',
      title: 'API key',
      format: 'password',
      'x-show-if': { field: 'hasSecret', value: true },
    },
  },
};

// Custom format renderer — proves the formatRenderers extension. Domain
// renderers (model pickers, OAuth) live in the consumer; this is the simplest
// possible one.
function ColorFormat({ value, onChange }: FormatRendererProps) {
  return (
    <input
      type="color"
      value={typeof value === 'string' && value ? value : '#3b82f6'}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

const FORMAT_RENDERERS = {
  color: ColorFormat
};

function validate(v: Record<string, unknown>): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!v.name) errors.name = 'Name is required';
  return errors;
}

// Three "database" records to load. Advanced is set so the section round-trips.
type FormValue = Record<string, unknown>;
interface DemoRecord {
  id: string;
  label: string;
  data: FormValue;
}

const RECORDS: DemoRecord[] = [
  {
    id: 'r_ada',
    label: 'Ada Lovelace (admin)',
    data: {
      name: 'Ada Lovelace', role: 'admin', bio: 'Wrote the first algorithm.', notifications: true,
      maxTokens: 8000, favoriteColor: '#3b82f6', tags: ['math', 'poetry'],
      advanced: { temperature: 0.7, retries: 2 }, hasSecret: false,
    },
  },
  {
    id: 'r_alan',
    label: 'Alan Turing (editor)',
    data: {
      name: 'Alan Turing', role: 'editor', bio: 'Broke Enigma.', notifications: false,
      maxTokens: 16000, favoriteColor: '#22c55e', tags: ['logic', 'computation'],
      advanced: { temperature: 0.2, retries: 5 }, hasSecret: true, apiKey: 'sk-demo-turing',
    },
  },
  {
    id: 'r_grace',
    label: 'Grace Hopper (viewer)',
    data: {
      name: 'Grace Hopper', role: 'viewer', bio: 'Invented the compiler.', notifications: true,
      maxTokens: 32000, favoriteColor: '#a855f7', tags: ['cobol', 'navy'],
      advanced: { temperature: 1, retries: 0 }, hasSecret: false,
    },
  },
];

export function CatalogFormPanel(): ReactNode {
  const scena = useScena();

  // Controlled form — value held in React.
  const [ctlValue, setCtlValue] = useState<FormValue>(RECORDS[0]!.data);
  const [ctlBaseline, setCtlBaseline] = useState<FormValue>(RECORDS[0]!.data);
  const [ctlLoading, setCtlLoading] = useState(false);
  const [ctlDirty, setCtlDirty] = useState(false);

  // Store-bound form — value lives at BOUND_PATH; baseline tracked here.
  const bound = (useStore<FormValue>(BOUND_PATH) ?? {}) as FormValue;
  const [bndBaseline, setBndBaseline] = useState<FormValue>(() => (scena.store.get(BOUND_PATH) as FormValue) ?? {});
  const [bndLoading, setBndLoading] = useState(false);
  const [bndDirty, setBndDirty] = useState(false);

  // Loader selector.
  const [selRecord, setSelRecord] = useState(RECORDS[0]!.id);
  const [selForm, setSelForm] = useState<'controlled' | 'bound'>('bound');

  // Load `data` into a form. Async path flips the form's `loading` flag, waits,
  // then commits value + baseline (so the freshly-loaded record starts clean).
  function loadControlled(data: FormValue, async: boolean): void {
    if (!async) {
      setCtlValue(data);
      setCtlBaseline(data);
      return;
    }
    setCtlLoading(true);
    window.setTimeout(() => {
      setCtlValue(data);
      setCtlBaseline(data);
      setCtlLoading(false);
    }, LOAD_MS);
  }

  function loadBound(data: FormValue, async: boolean): void {
    if (!async) {
      scena.store.set(BOUND_PATH, data);
      setBndBaseline(data);
      return;
    }
    setBndLoading(true);
    window.setTimeout(() => {
      scena.store.set(BOUND_PATH, data);
      setBndBaseline(data);
      setBndLoading(false);
    }, LOAD_MS);
  }

  function doLoad(async: boolean): void {
    const rec = RECORDS.find((r) => r.id === selRecord);
    if (!rec) return;
    if (selForm === 'controlled') loadControlled(rec.data, async);
    else loadBound(rec.data, async);
  }

  return (
    <div className="form-demo">
      <header>
        <h2>Catalog — Forms</h2>
        <p>
          One <code>SchemaForm</code> + schema, two data modes. Edit either side and watch the live
          value. Each section has a <code>fields | json</code> switch (right form disables it on
          sections via <code>jsonTextFields=false</code>). Editing makes the form dirty → a{' '}
          <code>reset</code> appears (in the switch bar and before Submit) that reverts to the loaded
          record. <strong>Submit</strong> loads this form's data into the <em>other</em> form
          asynchronously — watch it fade (<code>data-loading</code>) then populate. Use the loader
          below to drop a record into either form, sync or async.
        </p>
      </header>

      <div className="form-demo__cols">
        {/* Controlled */}
        <section className="form-demo__col">
          <h3>Controlled <small>useState + onChange (web-next style)</small></h3>
          <Form loading={ctlLoading} onSubmit={() => loadBound(ctlValue, true)}>
            <SchemaForm
              schema={DEMO_SCHEMA}
              value={ctlValue}
              baseline={ctlBaseline}
              onChange={setCtlValue}
              onDirtyChange={setCtlDirty}
              errors={validate(ctlValue)}
              formatRenderers={FORMAT_RENDERERS}
              namespace="ctl"
            />
            <div className="form-demo__footer">
              {ctlDirty ? (
                <Button type="reset" variant="default" label="reset" onClick={() => setCtlValue(ctlBaseline)} />
              ) : null}
              <Button type="submit" variant="primary" label="Submit → Bound" />
            </div>
          </Form>
          <h4>value{ctlDirty ? ' · unsaved' : ''}</h4>
          <pre className="form-demo__json">{JSON.stringify(ctlValue, null, 2)}</pre>
        </section>

        {/* Store-bound */}
        <section className="form-demo__col">
          <h3>Store-bound <small>value/onChange ↔ {BOUND_PATH}</small></h3>
          <Form loading={bndLoading} onSubmit={() => loadControlled(bound, true)}>
            <SchemaForm
              schema={DEMO_SCHEMA}
              value={bound}
              baseline={bndBaseline}
              onChange={(next) => scena.store.set(BOUND_PATH, next)}
              onDirtyChange={setBndDirty}
              errors={validate(bound)}
              formatRenderers={FORMAT_RENDERERS}
              namespace="bnd"
              jsonTextFields={false}
            />
            <div className="form-demo__footer">
              {bndDirty ? (
                <Button type="reset" variant="default" label="reset" onClick={() => scena.store.set(BOUND_PATH, bndBaseline)} />
              ) : null}
              <Button type="submit" variant="primary" label="Submit → Controlled" />
            </div>
          </Form>
          <h4>store @ {BOUND_PATH}{bndDirty ? ' · unsaved' : ''}</h4>
          <pre className="form-demo__json">{JSON.stringify(bound, null, 2)}</pre>
        </section>
      </div>

      {/* Loader toolbar */}
      <div className="form-demo__loader">
        <label>
          Record
          <select value={selRecord} onChange={(e) => setSelRecord(e.target.value)}>
            {RECORDS.map((r) => (
              <option key={r.id} value={r.id}>{r.label}</option>
            ))}
          </select>
        </label>
        <label>
          Form
          <select value={selForm} onChange={(e) => setSelForm(e.target.value as 'controlled' | 'bound')}>
            <option value="controlled">Controlled</option>
            <option value="bound">Bound</option>
          </select>
        </label>
        <Button type="button" variant="primary" label="Load Sync" onClick={() => doLoad(false)} />
        <Button type="button" variant="default" label="Load Async" onClick={() => doLoad(true)} />
      </div>
    </div>
  );
}
