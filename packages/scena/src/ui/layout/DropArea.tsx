import type { CSSProperties, ReactNode } from 'react';
import { useScena } from '../../react/ScenaProvider.js';
import { useDropArea } from '../../react/surface-drop.js';

export interface DropAreaProps {
  children?: ReactNode;
  // The component names it takes, read from the dropped thing's resource.
  // Unset: any tab or row.
  accepts?: string[];
  // Runs with `args` and the dropped thing as `drop`.
  command?: string;
  args?: Record<string, unknown>;
  // Shown when it has no children.
  label?: string;
  style?: CSSProperties;
}

// A drop area a graph page can hold. A tab or a row dropped on it runs
// `command` with `{ ...args, drop }`, and stays where it was: an area links,
// and the surface around it does not take the drop. See useDropArea.
export function DropArea({ children, accepts, command, args, label, style }: DropAreaProps) {
  const scena = useScena();
  const area = useDropArea({
    ...(accepts ? { accepts: (thing) => accepts.includes(String(thing.resource.component)) } : {}),
    onDrop: (drop) => {
      if (command) void scena.commands.execute(command, { ...args, drop });
    },
  });
  return (
    <div className="oo-drop-area" data-drop-over={area.over || undefined} style={style} {...area.props}>
      {children ?? <span className="oo-drop-area__label">{label}</span>}
    </div>
  );
}
