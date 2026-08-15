import type { CSSProperties, ReactNode } from 'react';

export interface SectionTitleProps {
  children: ReactNode;
  style?: CSSProperties;
}

// A small uppercase section heading inside a detail panel — e.g. "USAGE",
// "Active agents", "Records". Reusable so every section label is consistent.
export function SectionTitle({ children, style }: SectionTitleProps): ReactNode {
  return (
    <div className="oo-section-title" style={{ ...style }}>
      {children}
    </div>
  );
}

