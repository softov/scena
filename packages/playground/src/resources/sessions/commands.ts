import type { Command, CommandContext, SurfaceName } from '@softov/scena/types';
import { besideWindow, openTabWindow } from '@softov/scena';
import { readSessionOpens, sessionPath, type Session } from './data.js';

export const sessionKey = (id: string) => `session:${id}`;

type Place = 'main' | 'right' | 'window';
interface OpenArgs {
  sessionId?: string;
  // Where a FIRST open goes. Unset: where "Sessions open in" says. An open
  // session is focused where it is, whatever this says.
  place?: Place;
}

function where(ctx: CommandContext, key: string): SurfaceName | undefined {
  return ctx.surfaces.listSurfaces().find((s) => ctx.surfaces.listAt(s).some((m) => m.key === key));
}

function showSurface(ctx: CommandContext, surface: SurfaceName): void {
  const state = ctx.scena.layout.get().surfaces[surface];
  if (state?.visible === false) ctx.scena.layout.setSurface(surface, { ...state, visible: true });
}

function openSession(ctx: CommandContext, id: string, place?: Place): void {
  const session = ctx.store.get<Session>(sessionPath(id));
  const key = sessionKey(id);
  const at = where(ctx, key);
  if (at !== undefined) {
    // Open already: focus it where it is, wherever a person moved it.
    showSurface(ctx, at);
    ctx.surfaces.focus(key);
    return;
  }
  const first = place ?? readSessionOpens(ctx.store);
  const surface: SurfaceName = first === 'right' ? 'sidebar:right' : 'main';
  ctx.surfaces.open({
    surface,
    key,
    resource: { component: 'SessionView', sessionId: id },
    props: { title: session?.title ?? id },
  });
  if (first === 'right') showSurface(ctx, 'sidebar:right');
  if (first === 'window' && typeof window !== 'undefined') openTabWindow(ctx.scena, key, besideWindow(window));
}

const targetId = (ctx: CommandContext, args: unknown) =>
  (args as OpenArgs | undefined)?.sessionId ?? ctx.store.get<string>('$/resource/id') ?? '';

// One command per place, for the list's context menu: "open on X", "open on Y".
const openAt = (id: string, title: string, place: Place | undefined, icon: string): Command => ({
  id,
  title,
  category: 'Sessions',
  icon,
  slots: ['resource:context'],
  when: '$/resource/kind == "session"',
  run: (ctx, args) => {
    const sessionId = targetId(ctx, args);
    if (!sessionId) return;
    openSession(ctx, sessionId, (args as OpenArgs | undefined)?.place ?? place);
    ctx.host?.closeMenu();
  },
});

export const sessionCommands: Command[] = [
  openAt('sessions.open', 'Open', undefined, '↗'),
  openAt('sessions.openMain', 'Open in the main area', 'main', '▭'),
  openAt('sessions.openRight', 'Open in the right sidebar', 'right', '◨'),
  openAt('sessions.openWindow', 'Open in a new window', 'window', '⧉'),
];
