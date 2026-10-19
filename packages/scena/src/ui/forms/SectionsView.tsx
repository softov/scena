import { Fragment, useState, type ReactNode } from 'react';
import { useI18n } from '../../react/hooks/useI18n.js';
import { cleanDescription, deepEqual } from './schema-walk.js';
import type { SchemaFormView, SchemaFormViewProps } from './views.js';
import './SectionsView.css';

// A named run of a form's top-level keys.
export interface SchemaFormSection {
  id: string;
  title: string;
  description?: string;
  keys: string[];
}

// Sections under one heading of the tree.
export interface SchemaFormGroup {
  id: string;
  title: string;
  sections: SchemaFormSection[];
}

// What is chosen in the tree: a whole group, or one of its sections.
type Chosen = { group: string; section?: string };

// One run of fields in the content, under its title.
type Block = { key: string; title?: string; description?: string; rows: ReactNode[] };

const OTHER = 'other';

/**
 * A view that draws the groups and sections it is given as a tree beside the
 * chosen one's fields, with a search over every field's title, key and
 * description. A key no section names is listed under Other, so a key the
 * schema gains later is never hidden.
 */
export function sectionsView(groups: SchemaFormGroup[]): SchemaFormView {
  return {
    id: 'sections',
    render: function Sections(props: SchemaFormViewProps) {
      return <SectionsView groups={groups} {...props} />;
    },
  };
}

function SectionsView({ groups, schema, keys, value, baseline, renderField }: SchemaFormViewProps & { groups: SchemaFormGroup[] }) {
  const { t } = useI18n();
  const known = new Set(keys);
  const named = new Set<string>();
  const shown: SchemaFormGroup[] = [];
  for (const group of groups) {
    const sections = group.sections
      .map((section) => ({ ...section, keys: section.keys.filter((key) => known.has(key)) }))
      .filter((section) => section.keys.length > 0);
    for (const section of sections) for (const key of section.keys) named.add(key);
    if (sections.length > 0) shown.push({ ...group, sections });
  }
  const rest = keys.filter((key) => !named.has(key));
  if (rest.length > 0) {
    const title = t('form/other', 'Other');
    shown.push({ id: OTHER, title, sections: [{ id: OTHER, title, keys: rest }] });
  }

  const first = shown[0];
  const [chosen, setChosen] = useState<Chosen>(() => ({ group: first?.id ?? '', ...(first?.sections[0] ? { section: first.sections[0].id } : {}) }));
  const [folded, setFolded] = useState<ReadonlySet<string>>(() => new Set());
  const [query, setQuery] = useState('');
  // While searching, the node the results are narrowed to; null shows every match.
  const [scope, setScope] = useState<Chosen | null>(null);

  const edited = (section: SchemaFormSection): boolean => section.keys.some((key) => !deepEqual(value[key], baseline[key]));
  const needle = fold(query.trim());
  const searching = needle !== '';
  const matches = (key: string): boolean => {
    if (!searching) return true;
    const field = schema.properties?.[key];
    return fold(`${field?.title ?? ''} ${key} ${cleanDescription(field?.description) ?? ''}`).includes(needle);
  };
  const fields = (section: SchemaFormSection): ReactNode[] =>
    section.keys.filter(matches).map((key) => renderField(key)).filter((node) => node !== null && node !== undefined && node !== false);

  // The tree: every group and section, or while searching only those with a match, with how many.
  const tree = shown
    .map((one) => {
      const parts = one.sections.map((part) => ({ part, rows: searching ? fields(part) : [] })).filter((entry) => !searching || entry.rows.length > 0);
      return { group: one, parts, count: parts.reduce((sum, entry) => sum + entry.rows.length, 0) };
    })
    .filter((entry) => entry.parts.length > 0);
  const found = tree.reduce((sum, entry) => sum + entry.count, 0);

  const group = shown.find((one) => one.id === chosen.group) ?? first;
  const section = group?.sections.find((one) => one.id === chosen.section);
  const titleOf = (one: SchemaFormGroup, part: SchemaFormSection): string => (one.id === part.id ? part.title : `${one.title} › ${part.title}`);

  // What the content shows: the matches (in the scope, when one is chosen), else the chosen section or group.
  let blocks: Block[];
  let heading: string;
  if (searching) {
    const inScope = tree.filter((entry) => scope === null || entry.group.id === scope.group);
    blocks = inScope.flatMap((entry) =>
      entry.parts
        .filter(({ part }) => scope?.section === undefined || part.id === scope.section)
        // The heading already names a scoped section, and a scoped group names itself.
        .map(({ part, rows }) => ({
          key: `${entry.group.id}/${part.id}`,
          ...(scope?.section !== undefined ? {} : { title: scope === null ? titleOf(entry.group, part) : part.title }),
          rows,
        })),
    );
    const scoped = scope === null ? undefined : shown.find((one) => one.id === scope.group);
    const scopedPart = scope?.section === undefined ? undefined : scoped?.sections.find((one) => one.id === scope.section);
    heading = scoped !== undefined && scopedPart !== undefined ? titleOf(scoped, scopedPart) : scoped?.title ?? t('form/searchResults', 'Search results');
  } else {
    blocks = section !== undefined
      ? [{ key: section.id, ...(section.description ? { description: section.description } : {}), rows: fields(section) }]
      : (group?.sections ?? []).map((part) => ({ key: part.id, title: part.title, ...(part.description ? { description: part.description } : {}), rows: fields(part) }));
    heading = section?.title ?? group?.title ?? '';
  }

  // Outside a search a node is chosen; inside one it narrows the results, and the search stays.
  const pick = (next: Chosen): void => {
    if (!searching) {
      setChosen(next);
      return;
    }
    setScope(scope !== null && scope.group === next.group && scope.section === next.section ? null : next);
  };
  const pickGroup = (id: string): void => {
    if (!searching && chosen.group === id && chosen.section === undefined) {
      setFolded((held) => {
        const next = new Set(held);
        if (!next.delete(id)) next.add(id);
        return next;
      });
    }
    pick({ group: id });
  };
  const isCurrent = (groupId: string, sectionId?: string): boolean => {
    const at = searching ? scope : chosen;
    return at !== null && at.group === groupId && at.section === sectionId;
  };
  const picked = searching ? scope : chosen;
  const pickedValue = picked === null ? '' : picked.section === undefined ? picked.group : `${picked.group}/${picked.section}`;

  return (
    <div className="oo-sections">
      <div className="oo-sections__search">
        <input
          type="search"
          value={query}
          placeholder={t('form/searchSettings', 'Search settings')}
          aria-label={t('form/searchSettings', 'Search settings')}
          onChange={(event) => {
            setQuery(event.target.value);
            setScope(null);
          }}
        />
        {searching ? (
          <span className="oo-sections__found" role="status">
            {found === 1 ? t('form/foundOne', '1 setting found') : `${found} ${t('form/foundMany', 'settings found')}`}
          </span>
        ) : null}
      </div>
      <div className="oo-sections__body">
        <nav className="oo-sections__tree" aria-label={t('form/sections', 'Sections')}>
          {tree.map(({ group: one, parts, count }) => {
            // A search opens every group it finds something in.
            const open = searching || !folded.has(one.id);
            return (
              <Fragment key={one.id}>
                <button
                  type="button"
                  className="oo-sections__node"
                  data-level="group"
                  aria-expanded={open}
                  aria-current={isCurrent(one.id) ? 'true' : undefined}
                  onClick={() => pickGroup(one.id)}
                >
                  <span className="oo-sections__caret" aria-hidden="true">{open ? '▾' : '▸'}</span>
                  <span className="oo-sections__label">{one.title}</span>
                  {searching ? <span className="oo-sections__count">{count}</span> : null}
                  {!open && one.sections.some(edited) ? <span className="oo-sections__dot" title={t('form/edited', 'Edited')} /> : null}
                </button>
                {open
                  ? parts.map(({ part, rows }) => (
                      <button
                        key={part.id}
                        type="button"
                        className="oo-sections__node"
                        data-level="section"
                        aria-current={isCurrent(one.id, part.id) ? 'true' : undefined}
                        onClick={() => pick({ group: one.id, section: part.id })}
                      >
                        <span className="oo-sections__label">{part.title}</span>
                        {searching ? <span className="oo-sections__count">{rows.length}</span> : null}
                        {edited(part) ? <span className="oo-sections__dot" title={t('form/edited', 'Edited')} /> : null}
                      </button>
                    ))
                  : null}
              </Fragment>
            );
          })}
        </nav>
        <div className="oo-sections__content">
          <label className="oo-sections__pick">
            <span>{t('form/section', 'Section')}</span>
            <select
              value={pickedValue}
              onChange={(event) => {
                // A group id has no slash; a section id may (a plugin named @scope/name).
                const choice = event.target.value;
                if (choice === '') {
                  setScope(null);
                  return;
                }
                const at = choice.indexOf('/');
                const next = at < 0 ? { group: choice } : { group: choice.slice(0, at), section: choice.slice(at + 1) };
                if (searching) setScope(next);
                else setChosen(next);
              }}
            >
              {searching ? <option value="">{`${t('form/allResults', 'All results')} (${found})`}</option> : null}
              {tree.map(({ group: one, parts, count }) => (
                <Fragment key={one.id}>
                  <option value={one.id}>{searching ? `${one.title} (${count})` : one.title}</option>
                  {parts.map(({ part, rows }) => (
                    <option key={part.id} value={`${one.id}/${part.id}`}>{`  ${part.title}${searching ? ` (${rows.length})` : ''}`}</option>
                  ))}
                </Fragment>
              ))}
            </select>
          </label>
          <h2 className="oo-sections__heading">{heading}</h2>
          {blocks.map((block) => (
            <section key={block.key} className="oo-sections__block">
              {block.title === undefined ? null : <h3 className="oo-sections__title">{block.title}</h3>}
              {block.description === undefined ? null : <p className="oo-sections__description">{block.description}</p>}
              <div className="oo-sections__fields">{block.rows}</div>
            </section>
          ))}
          {blocks.every((block) => block.rows.length === 0) ? (
            <p className="oo-sections__empty">{t('form/noMatch', 'No setting matches.')}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function fold(text: string): string {
  return text.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
}
