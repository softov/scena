import { Translate, useScena, useStore } from '@softov/scena/react';
import { Avatar, Link, Listable, type ListableColumn } from '@softov/scena/ui';
import type { User } from './data.js';

// Contact-pattern demo:
//   Avatar | Name | Email | Team
//     - Name + Team are always visible (mode defaults to 'list' → both modes).
//     - Email is table-only; in narrow mode the Name cell folds it in via
//       the (item, ctx) render API.
//     - Team is rendered as a link that runs the `teams.open` command.
const COLUMNS: ListableColumn<User>[] = [
  {
    key: 'avatar',
    label: '',
    width: '40px',
    render: (u, ctx) => <Avatar name={u.name} size="sm" style={{ marginTop: ctx.tableMode ? 0 : '5px' }} />,
  },
  {
    key: 'name',
    label: <Translate k="field/nameLabel" fallback="Name" />,
    sortable: true,
    width: 'minmax(140px, 1fr)',
    style: { flex: 1 },
    render: (u, ctx) =>
      ctx.tableMode ? (
        u.name
      ) : (
        // Narrow mode: stack name + email together so we don't need a
        // separate Email row beneath in the list fallback.
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <span>{u.name}</span>
          <span style={{ color: 'var(--oo-color-muted)', fontSize: 11 }}>
            {u.email}
          </span>
        </div>
      ),
  },
  {
    key: 'email',
    label: <Translate k="field/emailLabel" fallback="Email" />,
    mode: 'table',
    sortable: true,
    width: 'minmax(160px, auto)',
    render: (u) => (
      <span style={{ color: 'var(--oo-color-muted)' }}>{u.email}</span>
    ),
  },
  {
    key: 'team',
    label: <Translate k="field/teamLabel" fallback="Team" />,
    sortable: true,
    visible: (u) => Boolean(u.teamId),
    width: 'minmax(80px, auto)',
    render: (u) => <TeamLink teamId={u.teamId} />,
  },
];

function TeamLink({ teamId }: { teamId: string }) {
  const scena = useScena();
  return (
    <Link
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation(); // don't trigger the row's onSelect
        void scena.commands.execute('teams.open', { teamId });
      }}
    >
      {teamId}
    </Link>
  );
}

export default function UserExplorer() {
  const scena = useScena();
  const users = useStore<User[]>('$/users/all') ?? [];
  const activeKind = useStore<string | null>('$/active/kind');
  const activeId = useStore<string | null>('$/active/id');
  const selectedKey = activeKind === 'user' ? activeId : null;

  return (
    <Listable<User>
      title="Users"
      items={users}
      columns={COLUMNS}
      getKey={(u) => u.id}
      initialSort={{ key: 'name', direction: 'asc' }}
      selectedKey={selectedKey}
      onSelect={(u) => scena.commands.execute('users.open', { userId: u.id })}
      contextMenuSlot="resource:context"
      contextFor={(u) => ({
        '$/resource/kind': 'user',
        '$/resource/id': u.id,
      })}
      emptyState="Loading…"
    />
  );
}
