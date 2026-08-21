import type { CSSProperties, ReactNode } from 'react';
import { useScena } from '../../react/ScenaProvider.js';
import { useStore } from '../../react/hooks/useStore.js';
import type { BindingPath } from '../../sdk/component-graph.js';
import './ButtonBar.css';

export type ButtonBarTone = 'default' | 'accent' | 'danger' | 'warning' | 'success' | 'muted';

export interface ButtonBarProps {
  icon?: string;
  label?: string;
  // Shown after the label — a count, a status. Bind it with `{ path }` from a
  // graph, or pass a value directly from JSX.
  value?: string | number;
  // Read `value` from the store instead. A graph normally binds `value`
  // directly; this exists for the mount-by-name case where the prop arrives
  // already resolved and a second reactive read is still wanted.
  valuePath?: BindingPath;
  // Command to run on click. Ignored when `onClick` is given.
  command?: string;
  args?: Record<string, unknown>;
  onClick?: () => void;
  tone?: ButtonBarTone;
  // Pressed / current. Drives `[data-active]`, not a separate class.
  active?: boolean;
  disabled?: boolean;
  title?: string;
  className?: string;
  style?: CSSProperties;
}

/**
 * The button that goes in a bar.
 *
 * One component for the title bar and the status bar rather than two, because
 * the difference between them is entirely presentational — the status bar is
 * smaller and quieter — and that difference is carried by the surrounding
 * `.oo-bar` context in CSS, not by a prop. A caller that wants the status-bar
 * treatment puts it in the status bar.
 *
 * Both apps grew a near-identical `CommandButton` for this; the useful part is
 * the parts they each got slightly wrong. It renders nothing when there is
 * nothing to show, it does not swallow a click while a command is missing, and
 * `title` falls back to the label so an icon-only button is never unlabelled
 * for a screen reader.
 */
export function ButtonBar({
  icon,
  label,
  value,
  valuePath,
  command,
  args,
  onClick,
  tone = 'default',
  active,
  disabled,
  title,
  className,
  style,
}: ButtonBarProps): ReactNode {
  const scena = useScena();
  const bound = useStore<string | number>(valuePath);
  const shown = valuePath ? bound : value;

  // Nothing to render is not an error, but an empty button is a dead 24px of
  // bar that still takes a click.
  if (icon === undefined && label === undefined && shown === undefined) return null;

  const accessible = title ?? label ?? command;

  function handleClick(): void {
    if (disabled) return;
    if (onClick) {
      onClick();
      return;
    }
    if (command) void scena.commands.execute(command, args);
  }

  const interactive = !disabled && (onClick !== undefined || command !== undefined);

  return (
    <button
      type="button"
      className={['oo-button-bar', className].filter(Boolean).join(' ')}
      style={style}
      data-tone={tone}
      data-active={active ?? undefined}
      data-interactive={interactive}
      disabled={disabled}
      title={accessible}
      aria-label={accessible}
      aria-pressed={active}
      onClick={handleClick}
    >
      {icon !== undefined ? (
        <span className="oo-button-bar__icon" aria-hidden="true">
          {icon}
        </span>
      ) : null}
      {label !== undefined ? <span className="oo-button-bar__label">{label}</span> : null}
      {shown !== undefined ? <span className="oo-button-bar__value">{shown}</span> : null}
    </button>
  );
}

export default ButtonBar;
