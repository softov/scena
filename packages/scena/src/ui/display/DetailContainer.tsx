import type { CSSProperties, ReactNode } from 'react';

export interface DetailContainerProps {
  children: ReactNode;
  style?: CSSProperties;
}

// The outer wrapper for a resource detail page: full height, column flow,
// scrollable. Pairs with DetailHeader + Tabs. Replaces the repeated inline
// `<div style={{ height:'100%', display:'flex', flexDirection:'column', overflow:'auto' }}>`.
export function DetailContainer({ children, style }: DetailContainerProps): ReactNode {
  return (
    <div
      className="oo-detail"
      style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'auto', ...style }}
    >
      {children}
    </div>
  );
}
