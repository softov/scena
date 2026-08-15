import type { CSSProperties, ReactNode } from 'react';
import { weightStyle } from '../_utils.js';
import './Link.css';

export type LinkKind = 'tel' | 'email' | 'web';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Phone-ish: optional leading +, then digits with spaces/dots/dashes/parens.
const TEL_RE = /^\+?\d[\d\s().-]*$/;

// Detect the target kind and normalize to a spec-compliant href:
//   a phone number (or tel: / tel://)    → tel:<number>     (dials)
//   an email address (or mailto:/email://) → mailto:<addr>  (composes)
//   any other already-schemed value       → kept as-is
//   everything else                        → https://<value>
export function resolveLinkHref(raw: string): { href: string; kind: LinkKind } {
  const v = raw.trim();
  // Accept the non-standard tel:// / email:// forms but emit the real scheme.
  if (/^tel:\/\//i.test(v)) return { href: `tel:${v.slice(6)}`, kind: 'tel' };
  if (/^email:\/\//i.test(v)) return { href: `mailto:${v.slice(8)}`, kind: 'email' };
  if (/^mailto:/i.test(v)) return { href: v, kind: 'email' };
  if (/^tel:/i.test(v)) return { href: v, kind: 'tel' };
  // Already carries a real scheme (http://, https://, ftp://, …) — keep it.
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(v)) return { href: v, kind: 'web' };
  if (EMAIL_RE.test(v)) return { href: `mailto:${v}`, kind: 'email' };
  if (TEL_RE.test(v)) return { href: `tel:${v}`, kind: 'tel' };
  return { href: `https://${v}`, kind: 'web' };
}

export interface LinkProps {
  href?: string;          // raw target; auto-normalized via resolveLinkHref
  label?: ReactNode;
  children?: ReactNode;
  external?: boolean;     // force target=_blank (default: true for web links)
  disabled?: boolean;
  onClick?: (e: React.MouseEvent<HTMLAnchorElement, MouseEvent>) => void;
  weight?: number;
  style?: CSSProperties;
}

export function Link({ href, label, children, external, disabled, onClick, weight, style }: LinkProps) {
  const resolved = href ? resolveLinkHref(href) : null;
  const content = children ?? label ?? href ?? '';
  const isExternal = external ?? resolved?.kind === 'web';
  return (
    <a
      className="oo-link"
      href={disabled ? undefined : resolved?.href}
      target={isExternal ? '_blank' : undefined}
      rel={isExternal ? 'noopener noreferrer' : undefined}
      data-kind={resolved?.kind}
      data-disabled={disabled || undefined}
      style={{ ...weightStyle(weight), ...style }}
      onClick={(e) => {
        if (disabled) {
          e.preventDefault();
          return;
        }
        onClick?.(e);
      }}
    >
      {content}
    </a>
  );
}
