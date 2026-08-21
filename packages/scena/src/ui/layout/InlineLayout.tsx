import type { ReactNode } from 'react';
import type { LayoutProps } from '../../sdk/layout.js';

// Horizontal inline row. Used for the statusbar. Mount order matches
// listAt() order; the StatusItem component handles its own side/priority
// via internal styling.
export function InlineLayout({ mounts, renderMount }: LayoutProps) {
  return (
    <div
      className="oo-layout oo-layout--inline"
      style={{
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 'var(--oo-spacing-md)',
        height: '100%',
      }}
    >
      {mounts.map((m) => (
        <div key={m.key} style={{ display: 'contents' }}>
          {renderMount(m) as ReactNode}
        </div>
      ))}
    </div>
  );
}
