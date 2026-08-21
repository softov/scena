import type { CSSProperties, ReactNode } from 'react';
import { useScena } from '../../react/ScenaProvider.js';
import { useStore } from '../../react/hooks/useStore.js';
import type { BindingPath } from '../../sdk/component-graph.js';
import './ActivityBarItem.css';

export type ActivityBadgeTone = 'accent' | 'danger' | 'warning' | 'success' | 'muted';

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
  // Run instead of activating a section. Both may be given: the command runs
  // and the section still activates.
  command?: string;
  args?: Record<string, unknown>;
  onClick?: () => void;
  className?: string;
  style?: CSSProperties;
}

const DEFAULT_SECTION_PATH = '$/layout/surfaces/sidebar:left/section' as BindingPath;

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
  command,
  args,
  onClick,
  className,
  style,
}: ActivityBarItemProps): ReactNode {
  const scena = useScena();
  const activeSection = useStore<string | undefined>(sectionPath);
  const active = section !== undefined && activeSection === section;

  // 0 is a real count and should not draw a badge; undefined and '' should not
  // either. Anything else, including a non-numeric string, should.
  const hasBadge = badge !== undefined && badge !== '' && Number(badge) !== 0;

  const describedBadge =
    hasBadge && badgeLabel ? `${label ?? section ?? ''} — ${badge} ${badgeLabel}` : undefined;

  function handleClick(): void {
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
    <button
      type="button"
      className={['oo-activity-item', className].filter(Boolean).join(' ')}
      style={style}
      data-active={active}
      data-pos={pos}
      title={describedBadge ?? label}
      aria-label={describedBadge ?? label}
      aria-current={active ? 'true' : undefined}
      onClick={handleClick}
    >
      <span className="oo-activity-item__icon" aria-hidden="true">
        {icon ?? '·'}
      </span>
      {hasBadge ? (
        <span className="oo-activity-item__badge" data-tone={badgeTone} aria-hidden="true">
          {badge}
        </span>
      ) : null}
    </button>
  );
}

export default ActivityBarItem;
