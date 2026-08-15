import type { CSSProperties, ReactNode } from 'react';
import { Avatar } from './Avatar.js';
import { Badge, type BadgeTone } from './Badge.js';
import './DetailHeader.css';

// Header for a resource detail page: avatar + title + status + a row of small
// facts (team, id, joined-on …) + optional right-aligned actions. Pairs with
// DetailList below it on the page.
export interface DetailHeaderMeta {
  label: ReactNode;
  value: ReactNode;
}

export interface DetailHeaderProps {
  title: ReactNode;
  subtitle?: ReactNode;
  avatarName?: string;
  avatarSrc?: string;
  avatarColor?: string;
  status?: { label: string; tone?: BadgeTone };
  meta?: DetailHeaderMeta[];
  actions?: ReactNode;
  style?: CSSProperties;
}

export function DetailHeader({
  title,
  subtitle,
  avatarName,
  avatarSrc,
  avatarColor,
  status,
  meta,
  actions,
  style,
}: DetailHeaderProps) {
  const showAvatar = Boolean(avatarName || avatarSrc);
  return (
    <header className="oo-detail-header" style={style}>
      {showAvatar ? (
        <Avatar name={avatarName} imgSrc={avatarSrc} color={avatarColor} size={56} />
      ) : null}
      <div className="oo-detail-header__body">
        <div className="oo-detail-header__titleline">
          <span className="oo-detail-header__title">{title}</span>
          {status ? <Badge tone={status.tone} label={status.label} /> : null}
        </div>
        {subtitle ? <div className="oo-detail-header__subtitle">{subtitle}</div> : null}
        {meta && meta.length > 0 ? (
          <div className="oo-detail-header__meta">
            {meta.map((m, i) => (
              <span className="oo-detail-header__meta-item" key={i}>
                <span className="oo-detail-header__meta-label">{m.label}</span>
                <span className="oo-detail-header__meta-value">{m.value}</span>
              </span>
            ))}
          </div>
        ) : null}
      </div>
      {actions ? <div className="oo-detail-header__actions">{actions}</div> : null}
    </header>
  );
}
