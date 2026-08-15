import { useScena, useStore } from '@softov/scena/react';
import type { BindingPath } from '@softov/scena/types';
import { DataTable, type DataRow } from '@softov/scena/ui';
import type { Team } from './data.js';

export default function TeamExplorer() {
  const scena = useScena();
  const teams = useStore<Team[]>('$/teams/all' as BindingPath) ?? [];
  const activeKind = useStore<string | null>('$/active/kind' as BindingPath);
  const activeId = useStore<string | null>('$/active/id' as BindingPath);

  return (
    <div className="explorer">
      <h2>Teams</h2>
      {teams.length === 0 ? (
        <div style={{ color: 'var(--oo-color-muted)' }}>Loading…</div>
      ) : (
        <DataTable
          columns={[
            { key: 'name', label: 'Team' },
            { key: 'description', label: 'About' },
          ]}
          rows={teams.map((t) => ({ id: t.id, name: t.name, description: t.description }))}
          rowKey="id"
          selectedKey={activeKind === 'team' ? activeId : null}
          onSelect={(row: DataRow) => {
            void scena.commands.execute('teams.open', { teamId: String(row.id) });
          }}
        />
      )}
    </div>
  );
}
