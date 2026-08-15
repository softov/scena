import type { Command } from '@softov/scena/types';
import { removeUser, type User } from './data.js';

interface OpenArgs { userId: string }
interface DeleteArgs { userId: string }

// `when` is now list-only (filters menu visibility via commands.list({
// enabled: true })); the command body is the run-time guard. Safe to gate
// these so they only show in menus when a user is targeted.
export const userCommands: Command[] = [
  {
    id: 'users.open',
    title: 'Open',
    category: 'Users',
    icon: '↗',
    color: 'blue',
    slots: ['resource:context'],
    when: '$/resource/kind == "user"',
    run: (ctx, args) => {
      const explicit = (args as OpenArgs | undefined)?.userId;
      const userId = explicit ?? ctx.store.get<string>('$/resource/id') ?? '';
      if (!userId) return;
      ctx.store.patchMany({
        '$/active/id': userId,
        '$/active/kind': 'user',
      });
      // Per-mount props.title overrides the component default; icon +
      // color are NOT set here — they come from UserDetail's
      // component-level `props` (👤, blue) so we don't repeat them per
      // open call.
      const user = ctx.store.get<User>(`$/users/byId/${userId}`);
      ctx.surfaces.open({
        surface: 'main',
        key: `user:${userId}`,
        resource: { component: 'UserDetail', userId },
        props: { title: user?.name ?? userId },
      });
      ctx.host?.closeMenu();
    },
  },
  // Split into two registrations because the `when` predicate is a single
  // string but the visibility rule differs by slot:
  //   - In `resource:context`: show when the right-clicked row is a user.
  //   - In `view/title`: show when the currently-active mount is a user.
  // The previous single-command OR clause leaked: when ANY user was active,
  // delete appeared in `resource:context` even when right-clicking a
  // non-user row. Two registrations sharing one `run` keep the behavior
  // honest without duplicating logic.
  ...makeDeleteCommand({
    id: 'users.delete',
    slot: 'resource:context',
    when: '$/resource/kind == "user"',
  }),
  ...makeDeleteCommand({
    id: 'users.deleteActive',
    slot: 'view/title',
    when: '$/active/kind == "user"',
  }),
];

function makeDeleteCommand(opts: {
  id: string;
  slot: string;
  when: string;
}): Command[] {
  return [{
    id: opts.id,
    title: 'Delete user',
    category: 'Users',
    icon: '🗑',
    color: 'red',
    slots: [opts.slot],
    when: opts.when,
    run: (ctx, args) => {
      const explicit = (args as DeleteArgs | undefined)?.userId;
      // resource/id wins when set (right-click target); fall back to
      // active/id for the view/title case where there's no right-click row.
      const userId =
        explicit ??
        ctx.store.get<string>('$/resource/id') ??
        ctx.store.get<string>('$/active/id');
      if (!userId) return;
      // removeUser keeps byId, the `all` array, and the summary count in
      // sync so the sidebar list re-renders without the deleted row.
      removeUser(ctx.store, userId);
      ctx.surfaces.close(`user:${userId}`, { reason: 'deleted' });
      ctx.host?.closeMenu();
    },
  }];
}
