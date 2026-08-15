import type { CSSProperties, ReactNode } from 'react';
import './Audio.css';

// a2ui v0.10: required `url`, optional `description` (title/summary).
// controls/autoPlay/loop are scena-only extensions. Legacy `src` accepted as
// transitional alias.
export interface AudioProps {
  url?: string;
  description?: string;
  // scena extensions:
  controls?: boolean;
  autoPlay?: boolean;
  loop?: boolean;
  style?: CSSProperties;
  // Legacy alias (deprecated):
  src?: string;
}

export function Audio({
  url,
  description,
  controls = true,
  autoPlay,
  loop,
  style,
  src,
}: AudioProps): ReactNode {
  const effectiveUrl = url ?? src;
  if (!effectiveUrl) return null;
  return (
    <div className="oo-audio-wrapper" style={style}>
      {description ? (
        <div className="oo-audio__description">{description}</div>
      ) : null}
      <audio
        className="oo-audio"
        src={effectiveUrl}
        controls={controls}
        autoPlay={autoPlay}
        loop={loop}
      />
    </div>
  );
}
