import type { Disposable, Scena } from '@softov/scena/types';
import { combineDisposables } from '@softov/scena';
import Explorer from './Explorer.js';
import { tagsDataProvider } from './data.js';

const ICON = '\u{1F3F7}\u{FE0E}';

export function registerTags(scena: Scena): Disposable {
  return combineDisposables(
    scena.store.registerDataProvider(tagsDataProvider),

    scena.components.register({
      component: 'TagExplorer',
      category: 'page',
      renderer: { kind: 'react', load: async () => ({ default: Explorer as unknown }) },
    }),

    scena.surfaces.mount({
      surface: 'activitybar',
      key: 'tags:nav',
      resource: {
        component: 'ActivityBarItem',
        icon: ICON,
        label: 'Tags',
        section: 'tags',
        badge: { path: '$/summary/tags/total' },
        badgeLabel: 'tags',
      },
    }),

    scena.surfaces.mount({
      surface: 'sidebar:left',
      key: 'tags:explorer',
      when: '$/layout/surfaces/sidebar:left/section == "tags"',
      resource: { component: 'TagExplorer' },
    }),
  );
}
