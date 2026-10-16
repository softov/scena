import { type CSSProperties, type MouseEvent as ReactMouseEvent, type ReactNode, useState } from 'react';
import { useScena } from '../../react/ScenaProvider.js';
import { ContextMenu } from '../menu/ContextMenu.js';
import { useStore } from '../../react/hooks/useStore.js';
import type { BindingPath } from '../../sdk/component-graph.js';
import './ActivityBarItem.css';

/**
 * What a badge means, which is not always "there are things".
 *
 * A count of items waiting and a count of hosts that fell over are not the same
 * news, and one accent colour said they were. The tone is a second channel
 * beside the number, never the only one: the count is always written, and
 * `badgeLabel` says what it counts.
 */
export type ActivityBadgeTone =
  | 'accent'
  | 'info'
  | 'danger'
  | 'warning'
  | 'success'
  | 'muted';

export interface ActivityBarItemProps {
  icon?: string;
  label?: string;
  // The sidebar section this entry activates. Omit for an entry that only runs
  // a command — a rail button whose destination is a panel, not a list.
  section?: string;
  // Which surface's section this reflects. Defaults to the left sidebar
  // because that is where a section list lives in every app that has one.
  sectionPath?: BindingPath;
  // Anchored to the top or the bottom of the rail. The rail layout reads this.
  pos?: 'top' | 'bottom';
  // A resolved value, not a path: the mount resolves `{ path }` bindings
  // before props arrive.
  badge?: string | number;
  badgeTone?: ActivityBadgeTone;
  // What the number counts, for the tooltip and the screen reader. Without it
  // a bare number beside an icon is unreadable to anyone not looking at it.
  badgeLabel?: string;
  /**
   * A second count, in the opposite corner.
   *
   * Two badges only where a section really answers two questions somebody acts
   * on differently — a list of live agent sessions is the case: how many are
   * working right now, and how many finished without anybody reading them. One
   * is activity, the other is a backlog, and collapsing them into a sum would
   * name neither.
   *
   * Kept to two. A third would be a chart on a 44-pixel icon.
   */
  secondBadge?: string | number;
  secondBadgeTone?: ActivityBadgeTone;
  secondBadgeLabel?: string;
  // Run instead of activating a section. Both may be given: the command runs
  // and the section still activates.
  command?: string;
  args?: Record<string, unknown>;
  // A command slot: clicking opens its commands as a menu beside the item
  // instead (VS Code's Manage gear). Their categories part it into groups.
  menu?: string;
  onClick?: () => void;
  className?: string;
  style?: CSSProperties;
}

const DEFAULT_SECTION_PATH = '$/layout/surfaces/sidebar:left/section' as BindingPath;

// 0 is a real count and should not draw a badge; undefined and '' should not
// either. Anything else, including a non-numeric string, should. A rail of
// zeroes is a rail of noise, and an absent badge is the clearest way to say
// there is nothing waiting.
function shown(value: string | number | undefined): boolean {
  return value !== undefined && value !== '' && Number(value) !== 0;
}

// Three digits do not fit a 15px pill beside a 44px icon, and the difference
// between 120 and 400 is not what the rail is for — either way the answer is
// "more than you are going to read here".
function clamp(value: string | number): string | number {
  return typeof value === 'number' && value > 99 ? '99+' : value;
}

/**
 * An entry in the activity bar.
 *
 * Every app on scena has written this, and it is the same component each time:
 * an icon, an optional count, and an active state derived from which sidebar
 * section is showing. What differed between the copies was only which of those
 * each app had needed so far.
 *
 * Active state is read from layout state rather than passed in, because the
 * caller is a `surfaces.mount` in a resource module that has no idea what else
 * is mounted. Reading it here is what lets a rail of independently-registered
 * entries agree on which one is current.
 *
 * With no `onClick`, clicking runs `command` if given and activates `section`
 * via the `sidebar.activate` command. That command is not part of scena — an
 * app registers it, because what "activate" means (which surface, whether it
 * also reveals) is an app's decision.
 */
export function ActivityBarItem({
  icon,
  label,
  section,
  sectionPath = DEFAULT_SECTION_PATH,
  pos,
  badge,
  badgeTone = 'accent',
  badgeLabel,
  secondBadge,
  secondBadgeTone = 'accent',
  secondBadgeLabel,
  command,
  args,
  menu,
  onClick,
  className,
  style,
}: ActivityBarItemProps): ReactNode {
  const scena = useScena();
  const [menuAt, setMenuAt] = useState<{ x: number; y: number } | null>(null);
  const activeSection = useStore<string | undefined>(sectionPath);
  // The section is its surface's layout state, beside its visibility: a section
  // behind a closed sidebar is not what is showing, so the item is not active.
  const surfaceVisible = useStore<boolean | undefined>(sectionPath.replace(/\/section$/, '/visible') as BindingPath);
  const active = section !== undefined && activeSection === section && surfaceVisible !== false;

  const hasBadge = shown(badge);
  const hasSecondBadge = shown(secondBadge);

  // Built as a sentence rather than a pair of numbers: "Live sessions: 2
  // running, 5 unread" is the whole state of the section in one line, and it is
  // the only place the two badges are told apart without colour.
  const counts = [
    ...(hasBadge ? [badgeLabel ? `${badge} ${badgeLabel}` : `${badge}`] : []),
    ...(hasSecondBadge
      ? [secondBadgeLabel ? `${secondBadge} ${secondBadgeLabel}` : `${secondBadge}`]
      : []),
  ];
  const name = label ?? section ?? '';
  const described = counts.length === 0 ? label : `${name}: ${counts.join(', ')}`;

  function handleClick(e: ReactMouseEvent<HTMLButtonElement>): void {
    if (menu) {
      // Beside the rail, level with the item; the popup keeps itself on screen.
      const r = e.currentTarget.getBoundingClientRect();
      setMenuAt({ x: r.right + 2, y: r.top });
      return;
    }
    if (onClick) {
      onClick();
      return;
    }
    if (command) void scena.commands.execute(command, args);
    // `section` last: it is this item's identity, and a stray args.section
    // silently activating a different one would be very hard to see.
    if (section) void scena.commands.execute('sidebar.activate', { ...args, section });
  }

  return (
    <>
      <button
        type="button"
        className={['oo-activity-item', className].filter(Boolean).join(' ')}
        style={style}
        data-active={active}
        data-pos={pos}
        title={described}
        aria-label={described}
        aria-current={active ? 'true' : undefined}
        aria-haspopup={menu ? 'menu' : undefined}
        aria-expanded={menu ? menuAt !== null : undefined}
        onClick={handleClick}
      >
        <span className="oo-activity-item__icon" aria-hidden="true">
          {icon ?? '·'}
        </span>
        {hasBadge ? (
          <span className="oo-activity-item__badge" data-tone={badgeTone} aria-hidden="true">
            {clamp(badge!)}
          </span>
        ) : null}
        {hasSecondBadge ? (
          <span
            className="oo-activity-item__badge oo-activity-item__badge--second"
            data-tone={secondBadgeTone}
            aria-hidden="true"
          >
            {clamp(secondBadge!)}
          </span>
        ) : null}
      </button>
      {menu && menuAt ? (
        <ContextMenu
          x={menuAt.x}
          y={menuAt.y}
          onClose={() => setMenuAt(null)}
          spec={{ query: { slot: menu }, groupLabels: false }}
        />
      ) : null}
    </>
  );
}

export default ActivityBarItem;
