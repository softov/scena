import { useEffect, useState } from 'react';
import { useScena, useStore } from '@softov/scena/react';
import type { BindingPath } from '@softov/scena/types';
import {
  DataTable,
  DetailHeader,
  DetailList,
  Form,
  FormActions,
  SchemaForm,
  Tabs,
  type DataRow,
  type JsonSchemaObject,
} from '@softov/scena/ui';
import type { Team } from './data.js';
import type { User } from '../users/data.js';

interface Props {
  teamId: string;
}

export default function TeamDetail({ teamId }: Props) {
  const team = useStore<Team>(`$/teams/byId/${teamId}` as BindingPath);
  const users = useStore<User[]>('$/users/all' as BindingPath) ?? [];

  if (!team) {
    return (
      <div className="detail">
        <h1>Team not found</h1>
        <p style={{ color: 'var(--oo-color-muted)' }}>
          The team <code>{teamId}</code> was not loaded.
        </p>
      </div>
    );
  }

  const members = users.filter((u) => u.teamId === team.id);

  return (
    <div
      className="detail"
      style={{ display: 'flex', flexDirection: 'column', gap: 'var(--oo-spacing-lg)', padding: 'var(--oo-spacing-lg)' }}
    >
      <DetailHeader
        title={team.name}
        subtitle={team.description}
        avatarName={team.name}
        meta={[
          { label: 'ID', value: team.id },
          { label: 'Members', value: members.length },
        ]}
      />
      <Tabs
        tabs={[
          { title: 'Overview', child: <Overview team={team} members={members} /> },
          { title: `Members (${members.length})`, child: <Members members={members} /> },
          { title: 'Settings', child: <Settings team={team} /> },
        ]}
      />
    </div>
  );
}

function Overview({ team, members }: { team: Team; members: User[] }) {
  return (
    <DetailList
      items={[
        { label: 'Name', value: team.name },
        { label: 'Description', value: team.description, span: true },
        { label: 'ID', value: team.id },
        { label: 'Members', value: members.length },
      ]}
    />
  );
}

function Members({ members }: { members: User[] }) {
  const scena = useScena();
  return (
    <DataTable
      columns={[
        { key: 'name', label: 'Name' },
        { key: 'email', label: 'Email' },
      ]}
      rows={members.map((u) => ({ id: u.id, name: u.name, email: u.email }))}
      rowKey="id"
      onSelect={(row: DataRow) => {
        void scena.commands.execute('users.open', { userId: String(row.id) });
      }}
      emptyState={<span style={{ color: 'var(--oo-color-muted)' }}>No members.</span>}
    />
  );
}

// Plain object literal → implicit index signature, assignable to the form's
// Record<string, unknown> without a cast.
function toDraft(t: Team): Record<string, unknown> {
  return { name: t.name, description: t.description };
}

function Settings({ team }: { team: Team }) {
  const scena = useScena();
  const [draft, setDraft] = useState<Record<string, unknown>>(() => toDraft(team));
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    setDraft(toDraft(team));
  }, [team]);

  const schema: JsonSchemaObject = {
    type: 'object',
    required: ['name'],
    properties: {
      name: { type: 'string', title: 'Name' },
      description: { type: 'string', title: 'Description', description: 'Short summary [textarea:3]' },
    },
  };

  function save(): void {
    const next: Team = {
      ...team,
      name: String(draft.name ?? team.name),
      description: String(draft.description ?? team.description),
    };
    scena.store.set(`$/teams/byId/${next.id}` as BindingPath, next);
    const all = (scena.store.get('$/teams/all' as BindingPath) as Team[]) ?? [];
    scena.store.set('$/teams/all' as BindingPath, all.map((t) => (t.id === next.id ? next : t)));
  }

  return (
    <Form onSubmit={save}>
      <SchemaForm
        schema={schema}
        value={draft}
        baseline={toDraft(team)}
        onChange={setDraft}
        onDirtyChange={setDirty}
        namespace="team"
      />
      <FormActions
        actions={[
          { label: 'Reset', hidden: !dirty, onClick: () => setDraft(toDraft(team)) },
          { label: 'Save', type: 'submit', variant: 'primary', disabled: !dirty },
        ]}
      />
    </Form>
  );
}
