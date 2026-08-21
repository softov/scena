import { useStore } from '@softov/scena/react';
import type { BindingPath } from '@softov/scena/types';
import type { Tag } from './data.js';

// A second section exists so the activity bar has something to switch BETWEEN.
// One section cannot demonstrate that `when` gates a sidebar mount.
export default function TagExplorer() {
  const tags = useStore<Tag[]>('$/tags/all' as BindingPath) ?? [];

  if (tags.length === 0) return <div className="demo-explorer__empty">Loading…</div>;

  return (
    <div className="demo-explorer">
      {tags.map((tag) => (
        <div key={tag.id} className="demo-explorer__row" data-selected={false}>
          <span className="demo-explorer__title">{tag.label}</span>
          <span className="demo-explorer__meta">{tag.count}</span>
        </div>
      ))}
    </div>
  );
}
