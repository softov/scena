import { useEffect, useState, type ReactNode } from 'react';
import {
  Button,
  DataTable,
  DetailHeader,
  DetailList,
  Form,
  FormActions,
  SchemaForm,
  Tabs,
  type BadgeTone,
  type DataRow,
  type JsonSchemaObject,
} from '@softov/scena/ui';
import './catalog-users-panel.css';

// Showcase for the detail bundle: DataTable → row click → user detail page
// (DetailHeader + Tabs[Overview = DetailList, Settings = SchemaForm]). Editing
// in Settings + Save writes back into the table and overview.

interface User {
  // index signature: lets User flow into DataRow / form value without casts.
  [key: string]: unknown;
  id: string;
  name: string;
  lastname: string;
  alias: string;
  email: string;
  status: 'active' | 'invited' | 'suspended';
  team: 'Engineering' | 'Research' | 'Operations';
  dateOfCadastre: string;
  resume: string;
}

const USERS: User[] = [
  { id: 'u_001', name: 'Ada', lastname: 'Lovelace', alias: 'ada', email: 'ada@analytical.engine', status: 'active', team: 'Engineering', dateOfCadastre: '2023-01-12', resume: 'Wrote the first published algorithm; works on the analytical engine compiler.' },
  { id: 'u_002', name: 'Alan', lastname: 'Turing', alias: 'alan', email: 'alan@bletchley.park', status: 'active', team: 'Research', dateOfCadastre: '2023-03-04', resume: 'Foundational work on computability and machine intelligence.' },
  { id: 'u_003', name: 'Grace', lastname: 'Hopper', alias: 'grace', email: 'grace@cobol.dev', status: 'invited', team: 'Engineering', dateOfCadastre: '2024-06-20', resume: 'Invented the first compiler; champion of machine-independent languages.' },
  { id: 'u_004', name: 'Edsger', lastname: 'Dijkstra', alias: 'edsger', email: 'edsger@eindhoven.nl', status: 'suspended', team: 'Research', dateOfCadastre: '2022-11-30', resume: 'Shortest paths, structured programming, and strong opinions on GOTO.' },
  { id: 'u_005', name: 'Margaret', lastname: 'Hamilton', alias: 'margaret', email: 'margaret@apollo.guidance', status: 'active', team: 'Operations', dateOfCadastre: '2023-09-08', resume: 'Led the Apollo onboard flight software; coined "software engineering".' },
  { id: 'u_006', name: 'Barbara', lastname: 'Liskov', alias: 'barbara', email: 'barbara@types.ok', status: 'invited', team: 'Research', dateOfCadastre: '2024-02-17', resume: 'Substitution principle, abstract data types, distributed systems.' },
];

const STATUS_TONE: Record<User['status'], BadgeTone> = {
  active: 'success',
  invited: 'info',
  suspended: 'warning',
};

const COLUMNS = [
  { key: 'name', label: 'Name', width: 'minmax(90px, 1fr)' },
  { key: 'alias', label: 'Alias' },
  { key: 'team', label: 'Team' },
  { key: 'status', label: 'Status', width: '90px' },
];

const USER_SCHEMA: JsonSchemaObject = {
  type: 'object',
  required: ['name', 'email'],
  properties: {
    name: { type: 'string', title: 'First name' },
    lastname: { type: 'string', title: 'Last name' },
    alias: { type: 'string', title: 'Alias' },
    email: { type: 'string', title: 'Email' },
    status: { type: 'string', title: 'Status', enum: ['active', 'invited', 'suspended'] },
    team: { type: 'string', title: 'Team', enum: ['Engineering', 'Research', 'Operations'] },
    resume: { type: 'string', title: 'Résumé', description: 'Short bio [textarea:3]' },
  },
};

export function CatalogUsersPanel(): ReactNode {
  const [users, setUsers] = useState<User[]>(USERS);
  const [selectedId, setSelectedId] = useState<string | null>(USERS[0]!.id);
  const selected = users.find((u) => u.id === selectedId) ?? null;

  function saveUser(next: User): void {
    setUsers((prev) => prev.map((u) => (u.id === next.id ? next : u)));
  }

  return (
    <div className="users-demo">
      <header>
        <h2>Catalog — Users (table + detail)</h2>
        <p>
          <code>DataTable</code> (sortable, responsive list⇄table) on the left. Click a row to open
          the user detail: a <code>DetailHeader</code> + <code>Tabs</code> with an <em>Overview</em>{' '}
          (<code>DetailList</code>) and a <em>Settings</em> form (<code>SchemaForm</code>). Edit in
          Settings and Save — the table and overview update.
        </p>
      </header>

      <div className="users-demo__body">
        <div className="users-demo__table">
          <DataTable
            columns={COLUMNS}
            rows={users}
            rowKey="id"
            selectedKey={selectedId}
            onSelect={(row: DataRow) => setSelectedId(String(row.id))}
          />
        </div>

        <div className="users-demo__detail">
          {selected ? (
            <UserDetail user={selected} onSave={saveUser} />
          ) : (
            <div className="users-demo__empty">Select a user.</div>
          )}
        </div>
      </div>
    </div>
  );
}

function UserDetail({ user, onSave }: { user: User; onSave: (u: User) => void }) {
  return (
    <>
      <DetailHeader
        title={`${user.name} ${user.lastname}`}
        subtitle={`@${user.alias} · ${user.email}`}
        avatarName={`${user.name} ${user.lastname}`}
        status={{ label: user.status, tone: STATUS_TONE[user.status] }}
        meta={[
          { label: 'Team', value: user.team },
          { label: 'ID', value: user.id },
          { label: 'Joined', value: user.dateOfCadastre },
        ]}
      />
      <Tabs
        tabs={[
          { title: 'Overview', child: <OverviewTab user={user} /> },
          { title: 'Settings', child: <SettingsTab user={user} onSave={onSave} /> },
        ]}
      />
    </>
  );
}

function OverviewTab({ user }: { user: User }) {
  return (
    <DetailList
      items={[
        { label: 'First name', value: user.name },
        { label: 'Last name', value: user.lastname },
        { label: 'Alias', value: `@${user.alias}` },
        { label: 'Email', value: user.email },
        { label: 'Team', value: user.team },
        { label: 'Status', value: user.status },
        { label: 'Registered', value: user.dateOfCadastre },
        { label: 'Résumé', value: user.resume, span: true },
      ]}
    />
  );
}

function SettingsTab({ user, onSave }: { user: User; onSave: (u: User) => void }) {
  const [draft, setDraft] = useState<Record<string, unknown>>(user);
  const [dirty, setDirty] = useState(false);

  // Re-sync when a different user is selected (or after a save).
  useEffect(() => {
    setDraft(user);
  }, [user]);

  function validate(v: Record<string, unknown>): Record<string, string> {
    const errors: Record<string, string> = {};
    if (!v.name) errors.name = 'First name is required';
    if (!v.email) errors.email = 'Email is required';
    return errors;
  }

  return (
    <Form onSubmit={() => onSave({ ...user, ...draft } as User)}>
      <SchemaForm
        schema={USER_SCHEMA}
        value={draft}
        baseline={user}
        onChange={setDraft}
        onDirtyChange={setDirty}
        errors={validate(draft)}
        namespace="user"
      />
      <FormActions>
        {dirty ? <Button type="button" onClick={() => setDraft(user)} label="Reset" /> : null}
        <Button type="submit" variant="primary" disabled={!dirty} label="Save" />
      </FormActions>
    </Form>
  );
}
