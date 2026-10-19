import type { CSSProperties } from 'react';
import './Chip.css';

/**
 * Whether a chip's value holds: `on`, held itself; `implied`, held through
 * something wider, such as a group the value is in; `off`, not held.
 */
export type ChipState = 'on' | 'implied' | 'off';

export interface ChipProps {
  label: string;
  state?: ChipState;
  onClick?: () => void;
  // Says what holds an implied chip, or what a click does; a native tooltip.
  title?: string;
  disabled?: boolean;
  style?: CSSProperties;
}

/**
 * A small pill that toggles one value, in three states rather than two: a
 * value can be held through something wider without being held itself. A row
 * of chips is a set of toggles; `aria-pressed` reads true only when on.
 */
export function Chip({ label, state = 'off', onClick, title, disabled, style }: ChipProps) {
  return (
    <button
      type="button"
      className="oo-chip"
      data-state={state}
      aria-pressed={state === 'on'}
      title={title}
      disabled={disabled}
      onClick={onClick}
      style={style}
    >
      {label}
    </button>
  );
}
