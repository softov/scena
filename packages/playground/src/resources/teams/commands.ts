import type { Command } from '@softov/scena/types';

interface OpenArgs {
  teamId: string;
}

export const teamCommands: Command[] = [
  {
    id: 'teams.open',
    title: 'Open Team',
    category: 'Teams',
    run: (ctx, args) => {
      const explicit = (args as OpenArgs | undefined)?.teamId;
      const teamId = explicit ?? ctx.store.get<string>('$/active/id');
      if (!teamId) return;
      ctx.store.patchMany({
        '$/active/id': teamId,
        '$/active/kind': 'team',
      });
      ctx.surfaces.open({
        surface: 'main',
        key: `team:${teamId}`,
        resource: {
          component: 'TeamDetail',
          teamId,
        },
      });
    },
  },
];
