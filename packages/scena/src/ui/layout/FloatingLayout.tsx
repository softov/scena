import type { ReactNode } from 'react';
import type { LayoutProps } from '../../sdk/layout.js';

// Floating overlay. Used for the `overlay` surface. The container is
// pointer-events: none so it doesn't block underlying chrome; each child
// re-enables pointer-events. Mounts decide their own positioning via
// inline style or CSS classes.
export function FloatingLayout({ mounts, renderMount }: LayoutProps) {
  return (
    <div
      className="oo-layout oo-layout--floating"
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
      }}
    >
      {mounts.map((m) => (
        <div key={m.key} style={{ pointerEvents: 'auto' }}>
          {renderMount(m) as ReactNode}
        </div>
      ))}
    </div>
  );
}
