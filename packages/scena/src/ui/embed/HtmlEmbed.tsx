import type { CSSProperties } from 'react';

// Sandboxed iframe with srcDoc. Defaults to no-scripts; enable `allowScripts`
// only when content is trusted. Use the standard `sandbox` attribute for
// finer control.
export interface HtmlEmbedProps {
  html: string;
  height?: number | string;
  width?: number | string;
  allowScripts?: boolean;
  sandbox?: string;
  title?: string;
  style?: CSSProperties;
  className?: string;
}

export function HtmlEmbed({
  html,
  height = 200,
  width = '100%',
  allowScripts,
  sandbox,
  title,
  style,
  className,
}: HtmlEmbedProps) {
  const effective = sandbox ?? (allowScripts ? 'allow-scripts allow-same-origin' : 'allow-same-origin');
  return (
    <div
      className={['oo-html-embed', className].filter(Boolean).join(' ')}
      style={{
        border: '1px solid var(--oo-color-border)',
        borderRadius: 'var(--oo-radius-md, 8px)',
        overflow: 'hidden',
        background: 'var(--oo-color-canvas)',
        ...style,
      }}
    >
      <iframe
        srcDoc={html}
        sandbox={effective}
        title={title ?? 'embedded HTML'}
        style={{
          width,
          height,
          border: 'none',
          display: 'block',
        }}
      />
    </div>
  );
}
