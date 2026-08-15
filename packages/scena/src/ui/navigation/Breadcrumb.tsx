import { Fragment, type CSSProperties, type ReactNode } from 'react';
import './Breadcrumb.css';

export interface BreadcrumbItem {
  label: ReactNode;
  href?: string;
  onClick?: () => void;
}

export interface BreadcrumbProps {
  items: BreadcrumbItem[];
  separator?: ReactNode;
  style?: CSSProperties;
  className?: string;
}

// Trail of items separated by `/`. Last item renders as plain text (current
// location); earlier items render as links (href) or buttons (onClick) or
// muted plain text when neither is set.
export function Breadcrumb({ items, separator = '/', style, className }: BreadcrumbProps) {
  return (
    <nav
      className={['oo-breadcrumb', className].filter(Boolean).join(' ')}
      aria-label="Breadcrumb"
      style={style}
    >
      {items.map((item, i) => {
        const isLast = i === items.length - 1;
        return (
          <Fragment key={i}>
            {i > 0 ? <span className="oo-breadcrumb__sep" aria-hidden>{separator}</span> : null}
            {item.href ? (
              <a
                className="oo-breadcrumb__link"
                href={item.href}
                aria-current={isLast ? 'page' : undefined}
              >
                {item.label}
              </a>
            ) : item.onClick && !isLast ? (
              <button type="button" className="oo-breadcrumb__link" onClick={item.onClick}>
                {item.label}
              </button>
            ) : (
              <span
                className="oo-breadcrumb__item"
                data-current={isLast ? 'true' : undefined}
              >
                {item.label}
              </span>
            )}
          </Fragment>
        );
      })}
    </nav>
  );
}
