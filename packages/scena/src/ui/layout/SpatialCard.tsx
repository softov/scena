import type { ReactNode } from 'react';
import type { LayoutProps } from '../../sdk/layout.js';
import type { ResolvedMount } from '../../sdk/mount-surface.js';
import { useScena } from '../../react/ScenaProvider.js';
import { useMountTitle } from './MountTitle.js';
import { NAMED_GLYPH } from '../display/Icon.js';
import type { CampusNodeRenderProps } from '../campus/types.js';

// The `card` node-type for SpatialLayout's CampusView. Rendered INSIDE a
// CampusNodus frame (the frame owns position/drag/resize/selection), so this
// file is only the card chrome: a draggable header (title/icon/close) plus
// the mount body. The header carries `data-campus-drag`, the selector
// CampusNodus uses to start a move.

export interface SpatialCardData {
  mount: ResolvedMount;
  renderMount: LayoutProps['renderMount'];
  onClose: () => void;
}

export function SpatialCard({ selected, data }: CampusNodeRenderProps) {
  const { mount, renderMount, onClose } = data as SpatialCardData;
  const scena = useScena();
  // Per-field merge: mount.props ?? component.props ?? key.
  const compProps = scena.components.get(mount.component.component)?.props;
  const title = useMountTitle(mount, mount.key);
  const icon = mount.props?.icon ?? compProps?.icon;
  const color = mount.props?.color ?? compProps?.color;

  return (
    <>
      <div
        className="oo-spatial-card__header"
        data-campus-drag
        data-color={color}
        style={{
          padding: 'var(--oo-spacing-xs) var(--oo-spacing-sm)',
          borderBottom: '1px solid var(--oo-color-border)',
          fontSize: 'var(--oo-font-size-xs)',
          color: selected ? 'var(--oo-color-fg)' : 'var(--oo-color-muted)',
          background: selected ? 'var(--oo-color-active)' : 'var(--oo-color-surface)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          cursor: 'grab',
          userSelect: 'none',
          touchAction: 'none',
          flex: '0 0 auto',
        }}
      >
        <span
          title={title}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, minWidth: 0 }}
        >
          {icon ? <span className="oo-spatial-card__icon" aria-hidden>{icon}</span> : null}
          <span
            className="oo-spatial-card__title"
            style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
          >
            {title}
          </span>
        </span>
        <span
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          title="Close"
          style={{ cursor: 'pointer' }}
        >
          {NAMED_GLYPH.closePanel}
        </span>
      </div>
      <div
        className="oo-spatial-card__body"
        style={{ flex: 1, overflow: 'auto', minHeight: 0 }}
      >
        {renderMount(mount) as ReactNode}
      </div>
    </>
  );
}
