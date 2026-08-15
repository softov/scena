import type { CSSProperties } from 'react';
import './Video.css';

// a2ui v0.10: required `url`, optional `posterUrl`. controls/autoPlay/loop/
// muted/width/height are scena-only extensions. Legacy `src`/`poster` accepted
// as transitional aliases.
export interface VideoProps {
  url?: string;
  posterUrl?: string;
  // scena extensions:
  controls?: boolean;
  autoPlay?: boolean;
  loop?: boolean;
  muted?: boolean;
  width?: number | string;
  height?: number | string;
  style?: CSSProperties;
  // Legacy aliases (deprecated):
  src?: string;
  poster?: string;
}

export function Video({
  url,
  posterUrl,
  controls = true,
  autoPlay,
  loop,
  muted,
  width,
  height,
  style,
  src,
  poster,
}: VideoProps) {
  const effectiveUrl = url ?? src;
  if (!effectiveUrl) return null;
  const effectivePoster = posterUrl ?? poster;
  return (
    <video
      className="oo-video"
      src={effectiveUrl}
      poster={effectivePoster}
      controls={controls}
      autoPlay={autoPlay}
      loop={loop}
      muted={muted}
      style={{ width, height, ...style }}
    />
  );
}
