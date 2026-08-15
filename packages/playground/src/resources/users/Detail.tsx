import { useEffect, useState } from 'react';
import { useScena, useStore } from '@softov/scena/react';
import type { BindingPath } from '@softov/scena/types';
import {
  Button,
  DetailHeader,
  DetailList,
  Form,
  FormActions,
  SchemaForm,
  Tabs,
  type JsonSchemaObject,
} from '@softov/scena/ui';
import type { User } from './data.js';
import type { Team } from '../teams/data.js';

interface Props {
  userId: string;
}

export default function UserDetail({ userId }: Props) {
  const scena = useScena();
  const user = useStore<User>(`$/users/byId/${userId}` as BindingPath);
  const teams = useStore<Team[]>('$/teams/all' as BindingPath) ?? [];
  const team = user ? teams.find((t) => t.id === user.teamId) : undefined;
  const [count, setCount] = useState(0);

  if (!user) {
    return (
      <div className="detail">
        <h1>User not found</h1>
        <p style={{ color: 'var(--oo-color-muted)' }}>
          The user <code>{userId}</code> was deleted or has not loaded yet.
        </p>
        <Button label="Close tab" onClick={() => scena.surfaces.close(`user:${userId}`)} />
      </div>
    );
  }

  return (
    <div
      className="detail"
      style={{ display: 'flex', flexDirection: 'column', gap: 'var(--oo-spacing-lg)', padding: 'var(--oo-spacing-lg)' }}
    >
      <DetailHeader
        title={user.name}
        subtitle={user.email}
        avatarName={user.name}
        meta={[
          { label: 'Team', value: team?.name ?? user.teamId },
          { label: 'ID', value: user.id },
        ]}
        actions={
          <>
            <Button
              label="Open team"
              onClick={() => {
                void scena.commands.execute('teams.open', { teamId: user.teamId });
              }}
            />
            <Button
              label={`Count: ${count}`}
              onClick={() => setCount((c) => c + 1)}
            />
          </>
        }
      />
      <Tabs
        tabs={[
          { title: 'Overview', child: <Overview user={user} team={team} /> },
          { title: 'Settings', child: <Settings user={user} teams={teams} /> },
        ]}
      />
    </div>
  );
}

function Overview({ user, team }: { user: User; team?: Team }) {
  return (
    <DetailList
      items={[
        { label: 'Name', value: user.name },
        { label: 'Email', value: user.email },
        { label: 'Team', value: team?.name ?? user.teamId },
        { label: 'ID', value: user.id },
      ]}
    />
  );
}

// Plain object literal → implicit index signature, assignable to the form's
// Record<string, unknown> without a cast.
function toDraft(u: User): Record<string, unknown> {
  return { name: u.name, email: u.email, teamId: u.teamId };
}

function Settings({ user, teams }: { user: User; teams: Team[] }) {
  const scena = useScena();
  const [draft, setDraft] = useState<Record<string, unknown>>(() => toDraft(user));
  const [dirty, setDirty] = useState(false);

  // Re-sync when the bound record changes (selected user / external update).
  useEffect(() => {
    setDraft(toDraft(user));
  }, [user]);

  const schema: JsonSchemaObject = {
    type: 'object',
    required: ['name', 'email'],
    properties: {
      name: { type: 'string', title: 'Name' },
      email: { type: 'string', title: 'Email' },
      teamId: { type: 'string', title: 'Team', enum: teams.map((t) => t.id) },
    },
  };

  function save(): void {
    const next: User = {
      ...user,
      name: String(draft.name ?? user.name),
      email: String(draft.email ?? user.email),
      teamId: String(draft.teamId ?? user.teamId),
    };
    scena.store.set(`$/users/byId/${next.id}` as BindingPath, next);
    const all = (scena.store.get('$/users/all' as BindingPath) as User[]) ?? [];
    scena.store.set('$/users/all' as BindingPath, all.map((u) => (u.id === next.id ? next : u)));
  }

  return (
    <Form onSubmit={save}>
      <SchemaForm
        schema={schema}
        value={draft}
        baseline={toDraft(user)}
        onChange={setDraft}
        onDirtyChange={setDirty}
        namespace="user"
      />
      <FormActions
        actions={[
          { label: 'Reset', hidden: !dirty, onClick: () => setDraft(toDraft(user)) },
          { label: 'Save', type: 'submit', variant: 'primary', disabled: !dirty },
        ]}
      />
    </Form>
  );
}
