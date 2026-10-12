import { Fragment, type CSSProperties, type ReactNode } from 'react';
import './Markdown.css';

// Markdown renderer. No external deps. Supports:
//   - Headings (# to ######), paragraphs, soft breaks, thematic breaks (---)
//   - Bold **x** / __x__, italic *x* / _x_, strikethrough ~~x~~, inline `code`
//   - Bullet lists (- * +), numbered lists (1. / 1)), task items ([ ] / [x]),
//     nested by indentation
//   - Blockquotes (>), nested
//   - Fenced code blocks (``` or ~~~), with light token colouring by language
//   - Tables (GitHub style), with column alignment
//   - Links [text](url), autolinks <url> and bare https:// URLs, images ![alt](src)
//   - Footnotes [^id] with [^id]: text definitions, listed at the end
// HTML in the source is shown as text, never rendered.
export interface MarkdownProps {
  text?: string;
  style?: CSSProperties;
  className?: string;
  /**
   * Draws an image, `![alt](src)`, given its src as written. Without it, an
   * `<img>` with that src, which the browser reads against the page's URL: a
   * host showing a file from elsewhere (a README next to its `docs/`) passes
   * one that reads the image from where the file is.
   */
  image?: (src: string, alt: string) => ReactNode;
}

export function Markdown({ text = '', style, className, image }: MarkdownProps) {
  const notes = new Map<string, string>();
  const blocks = parseBlocks(text.split(/\r?\n/), notes);
  const order: string[] = [];
  const ctx: Ctx = { notes, order, image };
  const body = blocks.map((b, i) => renderBlock(b, i, ctx));
  return (
    <div
      className={['oo-markdown', className].filter(Boolean).join(' ')}
      style={style}
    >
      {body}
      {order.length === 0 ? null : (
        <ol className="oo-markdown__notes">
          {order.map((id) => (
            <li key={id} id={noteId(id)}>{inline(notes.get(id) ?? '', ctx)}</li>
          ))}
        </ol>
      )}
    </div>
  );
}

type Align = 'left' | 'center' | 'right' | null;

interface ListItem {
  checked: boolean | null;
  blocks: Block[];
}

type Block =
  | { kind: 'h'; level: 1 | 2 | 3 | 4 | 5 | 6; text: string }
  | { kind: 'p'; lines: string[] }
  | { kind: 'list'; ordered: boolean; start: number; items: ListItem[] }
  | { kind: 'quote'; blocks: Block[] }
  | { kind: 'code'; lang: string; body: string }
  | { kind: 'hr' }
  | { kind: 'table'; head: string[]; align: Align[]; rows: string[][] };

/** Footnote text by id, and the order references first appear in. */
interface Ctx {
  notes: Map<string, string>;
  order: string[];
  image?: (src: string, alt: string) => ReactNode;
}

const HEADING = /^ {0,3}(#{1,6})\s+(.*?)(?:\s+#+)?\s*$/;
const FENCE = /^ {0,3}(`{3,}|~{3,})\s*([^`\s]*)/;
const HR = /^ {0,3}([-*_])(?:\s*\1){2,}\s*$/;
const QUOTE = /^ {0,3}>/;
const LIST = /^(\s*)([-*+]|\d{1,9}[.)])\s+(.*)$/;
const NOTE = /^\[\^([^\]]+)\]:\s*(.*)$/;
const DELIMITER = /^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|?\s*$/;

/** Whether `line` starts a block other than a paragraph, so a paragraph ends before it. */
function startsBlock(line: string, next: string | undefined): boolean {
  return (
    HEADING.test(line) ||
    FENCE.test(line) ||
    HR.test(line) ||
    QUOTE.test(line) ||
    LIST.test(line) ||
    (line.includes('|') && next !== undefined && DELIMITER.test(next))
  );
}

/** Width of leading whitespace, a tab counting as four. */
function indentOf(line: string): number {
  let n = 0;
  for (const ch of line) {
    if (ch === ' ') n += 1;
    else if (ch === '\t') n += 4;
    else break;
  }
  return n;
}

/** `line` without up to `n` columns of leading whitespace. */
function dedent(line: string, n: number): string {
  let i = 0;
  let w = 0;
  while (i < line.length && w < n) {
    if (line[i] === ' ') w += 1;
    else if (line[i] === '\t') w += 4;
    else break;
    i += 1;
  }
  return line.slice(i);
}

/** A table row's cells, split on pipes that are neither escaped nor inside a code span. */
function cellsOf(line: string): string[] {
  let s = line.trim();
  if (s.startsWith('|')) s = s.slice(1);
  if (s.endsWith('|') && !s.endsWith('\\|')) s = s.slice(0, -1);
  const cells: string[] = [];
  let cur = '';
  let inCode = false;
  for (let i = 0; i < s.length; i += 1) {
    const ch = s[i];
    if (ch === '\\' && s[i + 1] === '|') { cur += '|'; i += 1; continue; }
    if (ch === '`') inCode = !inCode;
    if (ch === '|' && !inCode) { cells.push(cur.trim()); cur = ''; continue; }
    cur += ch;
  }
  cells.push(cur.trim());
  return cells;
}

function alignOf(cell: string): Align {
  const left = cell.startsWith(':');
  const right = cell.endsWith(':');
  if (left && right) return 'center';
  if (right) return 'right';
  if (left) return 'left';
  return null;
}

function parseBlocks(lines: string[], notes: Map<string, string>): Block[] {
  const blocks: Block[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i] ?? '';
    if (line.trim() === '') { i += 1; continue; }

    const fence = FENCE.exec(line);
    if (fence) {
      const mark = fence[1] ?? '```';
      const indent = indentOf(line);
      const body: string[] = [];
      i += 1;
      while (i < lines.length) {
        const l = lines[i] ?? '';
        const close = /^ {0,3}(`{3,}|~{3,})\s*$/.exec(l);
        if (close && close[1]![0] === mark[0] && close[1]!.length >= mark.length) break;
        body.push(dedent(l, indent));
        i += 1;
      }
      i += 1; // consume closing fence
      blocks.push({ kind: 'code', lang: (fence[2] ?? '').toLowerCase(), body: body.join('\n') });
      continue;
    }

    const heading = HEADING.exec(line);
    if (heading) {
      blocks.push({ kind: 'h', level: heading[1]!.length as 1 | 2 | 3 | 4 | 5 | 6, text: heading[2] ?? '' });
      i += 1;
      continue;
    }

    if (HR.test(line)) { blocks.push({ kind: 'hr' }); i += 1; continue; }

    if (QUOTE.test(line)) {
      const inner: string[] = [];
      while (i < lines.length && (lines[i] ?? '').trim() !== '') {
        const l = lines[i] ?? '';
        // A line without `>` continues the quote's paragraph (lazy continuation).
        inner.push(QUOTE.test(l) ? l.replace(/^ {0,3}> ?/, '') : l);
        i += 1;
      }
      blocks.push({ kind: 'quote', blocks: parseBlocks(inner, notes) });
      continue;
    }

    const note = NOTE.exec(line);
    if (note) {
      const text = [note[2] ?? ''];
      i += 1;
      while (i < lines.length && indentOf(lines[i] ?? '') >= 2 && (lines[i] ?? '').trim() !== '') {
        text.push((lines[i] ?? '').trim());
        i += 1;
      }
      notes.set(note[1]!, text.join(' '));
      continue;
    }

    const item = LIST.exec(line);
    if (item) {
      const base = indentOf(line);
      const ordered = /\d/.test(item[2]![0]!);
      const start = ordered ? parseInt(item[2]!, 10) : 1;
      const items: ListItem[] = [];
      while (i < lines.length) {
        const head = LIST.exec(lines[i] ?? '');
        if (!head || indentOf(lines[i] ?? '') !== base || /\d/.test(head[2]![0]!) !== ordered) break;
        // Content lines sit at least this far in; a nested list is deeper still.
        const content = base + head[2]!.length + 1;
        let first = head[3] ?? '';
        let checked: boolean | null = null;
        const task = /^\[([ xX])\]\s+(.*)$/.exec(first);
        if (task) { checked = task[1] !== ' '; first = task[2] ?? ''; }
        const body = [first];
        i += 1;
        while (i < lines.length) {
          const l = lines[i] ?? '';
          if (l.trim() === '') {
            // A blank line ends the item unless the next line is indented into it.
            const next = lines[i + 1];
            if (next !== undefined && next.trim() !== '' && indentOf(next) >= content) { body.push(''); i += 1; continue; }
            break;
          }
          const ind = indentOf(l);
          if (ind > base && ind >= Math.min(content, base + 2)) { body.push(dedent(l, Math.min(ind, content))); i += 1; continue; }
          // An unindented line that starts nothing new continues the item's paragraph.
          if (ind <= base && !startsBlock(l, lines[i + 1])) { body.push(l.trim()); i += 1; continue; }
          break;
        }
        items.push({ checked, blocks: parseBlocks(body, notes) });
        // Blank lines between items of the same list.
        let j = i;
        while (j < lines.length && (lines[j] ?? '').trim() === '') j += 1;
        const again = LIST.exec(lines[j] ?? '');
        if (j > i && again && indentOf(lines[j] ?? '') === base && /\d/.test(again[2]![0]!) === ordered) i = j;
      }
      blocks.push({ kind: 'list', ordered, start, items });
      continue;
    }

    const next = lines[i + 1];
    if (line.includes('|') && next !== undefined && DELIMITER.test(next)) {
      const head = cellsOf(line);
      const align = cellsOf(next).map(alignOf);
      const rows: string[][] = [];
      i += 2;
      while (i < lines.length && (lines[i] ?? '').trim() !== '' && (lines[i] ?? '').includes('|') && !startsBlock(lines[i] ?? '', undefined)) {
        rows.push(cellsOf(lines[i] ?? ''));
        i += 1;
      }
      blocks.push({ kind: 'table', head, align, rows });
      continue;
    }

    // Paragraph: consecutive non-empty lines that start no other block.
    const pl: string[] = [line];
    i += 1;
    while (i < lines.length && (lines[i] ?? '').trim() !== '' && !startsBlock(lines[i] ?? '', lines[i + 1]) && !NOTE.test(lines[i] ?? '')) {
      pl.push(lines[i] ?? '');
      i += 1;
    }
    blocks.push({ kind: 'p', lines: pl.map((l) => l.trim()) });
  }
  return blocks;
}

/** An item that is one paragraph renders its text bare, so a tight list stays tight. */
function renderItem(item: ListItem, ctx: Ctx): ReactNode {
  const [first, ...rest] = item.blocks;
  const lead = first?.kind === 'p' ? renderLines(first.lines, ctx) : first === undefined ? null : renderBlock(first, 0, ctx);
  return (
    <>
      {item.checked === null ? null : <input type="checkbox" checked={item.checked} disabled readOnly className="oo-markdown__task" />}
      {lead}
      {rest.map((b, j) => renderBlock(b, j + 1, ctx))}
    </>
  );
}

function renderLines(lines: string[], ctx: Ctx): ReactNode {
  return lines.map((l, j) => (
    <Fragment key={j}>
      {inline(l, ctx)}
      {j < lines.length - 1 ? <br /> : null}
    </Fragment>
  ));
}

function renderBlock(b: Block, key: number, ctx: Ctx): ReactNode {
  switch (b.kind) {
    case 'h': {
      const Tag = (`h${b.level}`) as 'h1';
      return <Tag key={key}>{inline(b.text, ctx)}</Tag>;
    }
    case 'p':
      return <p key={key}>{renderLines(b.lines, ctx)}</p>;
    case 'hr':
      return <hr key={key} />;
    case 'quote':
      return <blockquote key={key}>{b.blocks.map((c, j) => renderBlock(c, j, ctx))}</blockquote>;
    case 'list': {
      const items = b.items.map((it, j) => (
        <li key={j} data-task={it.checked === null ? undefined : 'true'}>{renderItem(it, ctx)}</li>
      ));
      return b.ordered
        ? <ol key={key} start={b.start === 1 ? undefined : b.start}>{items}</ol>
        : <ul key={key}>{items}</ul>;
    }
    case 'code':
      return (
        <pre key={key} data-lang={b.lang || undefined}>
          <code>{highlight(b.lang, b.body)}</code>
        </pre>
      );
    case 'table': {
      const cols = b.head.length;
      const cell = (row: string[], c: number) => row[c] ?? '';
      const style = (c: number): CSSProperties | undefined => {
        const a = b.align[c];
        return a ? { textAlign: a } : undefined;
      };
      return (
        <div key={key} className="oo-markdown__table">
          <table>
            <thead>
              <tr>{b.head.map((h, c) => <th key={c} style={style(c)}>{inline(h, ctx)}</th>)}</tr>
            </thead>
            <tbody>
              {b.rows.map((row, r) => (
                <tr key={r}>
                  {Array.from({ length: cols }, (_, c) => <td key={c} style={style(c)}>{inline(cell(row, c), ctx)}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }
  }
}

const noteId = (id: string): string => `oo-fn-${id.replace(/[^\w-]/g, '_')}`;

/** Only these schemes become links; anything else (javascript:, data:) stays text. */
function safeHref(url: string): string | null {
  const u = url.trim();
  const scheme = /^([a-z][a-z0-9+.-]*):/i.exec(u);
  if (scheme === null) return u;
  return /^(https?|mailto|file|vscode|ahp[a-z-]*)$/i.test(scheme[1]!) ? u : null;
}

/**
 * A web link opens outside the page, and shows where it goes on hover, as
 * VS Code's markdown preview does: where the link text differs from the URL,
 * the URL is not on the screen otherwise, and an app's webview has no status
 * bar to show it.
 */
const WEB_LINK = (href: string) => ({ target: '_blank', rel: 'noreferrer noopener', title: href });

/** `data-kind` on a link: web for http(s) and mail, local for paths and other schemes. */
const linkKind = (href: string): 'web' | 'local' => (/^(https?|mailto):/i.test(href) ? 'web' : 'local');

/** The index of the `close` that balances the `open` at `from`, or -1. */
function balanced(s: string, from: number, open: string, close: string): number {
  let depth = 0;
  for (let i = from; i < s.length; i += 1) {
    if (s[i] === '\\') { i += 1; continue; }
    if (s[i] === open) depth += 1;
    else if (s[i] === close) {
      depth -= 1;
      if (depth === 0) return i;
    }
  }
  return -1;
}

const PUNCT = /[!-/:-@[-`{-~]/;
const WORD = /[\p{L}\p{N}]/u;

// Inline parser — runs left-to-right, taking the first construct that matches
// at each position. Plain text is accumulated between matches. Emphasis and
// link text are parsed recursively.
function inline(s: string, ctx: Ctx): ReactNode[] {
  const out: ReactNode[] = [];
  let i = 0;
  let buf = '';
  let k = 0;
  function flushBuf(): void { if (buf) { out.push(buf); buf = ''; } }
  function push(node: ReactNode): void { flushBuf(); out.push(<Fragment key={k++}>{node}</Fragment>); }

  /** `delim` emphasis at `i`: its inner text and where it ends, or null. */
  function span(delim: string): { inner: string; end: number } | null {
    if (s.slice(i, i + delim.length) !== delim) return null;
    const after = s[i + delim.length];
    if (after === undefined || after === ' ' || after === delim[0]) return null;
    // `_` inside a word is not emphasis (snake_case).
    if (delim[0] === '_' && i > 0 && WORD.test(s[i - 1]!)) return null;
    let from = i + delim.length + 1;
    while (from <= s.length) {
      const end = s.indexOf(delim, from);
      if (end < 0) return null;
      const before = s[end - 1];
      const next = s[end + delim.length];
      const closes = before !== ' ' && !(delim[0] === '_' && next !== undefined && WORD.test(next)) && next !== delim[0];
      if (closes) return { inner: s.slice(i + delim.length, end), end: end + delim.length };
      from = end + 1;
    }
    return null;
  }

  while (i < s.length) {
    const ch = s[i]!;

    if (ch === '\\' && i + 1 < s.length && PUNCT.test(s[i + 1]!)) {
      buf += s[i + 1];
      i += 2;
      continue;
    }

    if (ch === '`') {
      let n = 1;
      while (s[i + n] === '`') n += 1;
      const ticks = '`'.repeat(n);
      const end = s.indexOf(ticks, i + n);
      if (end > 0) {
        let body = s.slice(i + n, end);
        if (body.startsWith(' ') && body.endsWith(' ') && body.trim() !== '') body = body.slice(1, -1);
        push(<code>{body}</code>);
        i = end + n;
        continue;
      }
      buf += ticks;
      i += n;
      continue;
    }

    // [^id] footnote reference
    if (ch === '[' && s[i + 1] === '^') {
      const close = s.indexOf(']', i + 2);
      const id = close > 0 ? s.slice(i + 2, close) : '';
      if (id !== '' && ctx.notes.has(id)) {
        if (!ctx.order.includes(id)) ctx.order.push(id);
        const n = ctx.order.indexOf(id) + 1;
        push(<sup className="oo-markdown__ref" title={ctx.notes.get(id)}>{n}</sup>);
        i = close + 1;
        continue;
      }
    }

    // [text](url) and ![alt](src)
    if (ch === '[' || (ch === '!' && s[i + 1] === '[')) {
      const image = ch === '!';
      const open = image ? i + 1 : i;
      const close = balanced(s, open, '[', ']');
      if (close > 0 && s[close + 1] === '(') {
        const urlEnd = balanced(s, close + 1, '(', ')');
        if (urlEnd > 0) {
          const label = s.slice(open + 1, close);
          // A link title ("...") after the URL is dropped.
          const target = s.slice(close + 2, urlEnd).trim().replace(/\s+"[^"]*"$/, '').replace(/^<(.*)>$/, '$1');
          const href = safeHref(target);
          if (image) {
            push(href === null ? label : ctx.image ? ctx.image(href, label) : <img src={href} alt={label} />);
          } else if (href === null) {
            push(inline(label, ctx));
          } else {
            const kind = linkKind(href);
            push(
              <a href={href} data-kind={kind} {...(kind === 'web' ? WEB_LINK(href) : {})}>
                {inline(label, ctx)}
              </a>,
            );
          }
          i = urlEnd + 1;
          continue;
        }
      }
    }

    // <https://...> autolink
    if (ch === '<') {
      const m = /^<((?:https?|mailto):[^\s<>]+)>/i.exec(s.slice(i));
      if (m) {
        push(<a href={m[1]} data-kind="web" {...WEB_LINK(m[1])}>{m[1]}</a>);
        i += m[0].length;
        continue;
      }
    }

    // Bare https:// URL, not inside a word; trailing punctuation stays text.
    if ((ch === 'h' || ch === 'H') && (i === 0 || !WORD.test(s[i - 1]!))) {
      const m = /^https?:\/\/[^\s<>]*[^\s<>.,;:!?'")\]*_~]/i.exec(s.slice(i));
      if (m) {
        push(<a href={m[0]} data-kind="web" {...WEB_LINK(m[0])}>{m[0]}</a>);
        i += m[0].length;
        continue;
      }
    }

    const strong = span('**') ?? span('__');
    if (strong) { push(<strong>{inline(strong.inner, ctx)}</strong>); i = strong.end; continue; }

    const del = span('~~');
    if (del) { push(<del>{inline(del.inner, ctx)}</del>); i = del.end; continue; }

    const em = span('*') ?? span('_');
    if (em) { push(<em>{inline(em.inner, ctx)}</em>); i = em.end; continue; }

    buf += ch;
    i += 1;
  }
  flushBuf();
  return out;
}

// --- Code colouring -------------------------------------------------------
// A light tokenizer, not a grammar: comments, strings, numbers and keywords,
// picked by the fence's language. Unknown languages render plain.

type Family = 'c' | 'hash' | 'sql' | 'css' | 'markup' | 'json' | 'diff';

const FAMILY: Record<string, Family> = {
  js: 'c', jsx: 'c', ts: 'c', tsx: 'c', mjs: 'c', cjs: 'c', javascript: 'c', typescript: 'c',
  java: 'c', kotlin: 'c', kt: 'c', scala: 'c', swift: 'c', dart: 'c',
  c: 'c', h: 'c', cpp: 'c', 'c++': 'c', cc: 'c', hpp: 'c', cs: 'c', csharp: 'c', 'objective-c': 'c', objc: 'c',
  go: 'c', golang: 'c', rust: 'c', rs: 'c', php: 'c', zig: 'c', groovy: 'c', proto: 'c',
  py: 'hash', python: 'hash', rb: 'hash', ruby: 'hash', sh: 'hash', bash: 'hash', zsh: 'hash', shell: 'hash',
  console: 'hash', yaml: 'hash', yml: 'hash', toml: 'hash', ini: 'hash', conf: 'hash', perl: 'hash', pl: 'hash',
  r: 'hash', make: 'hash', makefile: 'hash', dockerfile: 'hash', docker: 'hash', nix: 'hash', powershell: 'hash', ps1: 'hash',
  sql: 'sql', psql: 'sql', mysql: 'sql', sqlite: 'sql', lua: 'sql', haskell: 'sql', hs: 'sql',
  css: 'css', scss: 'css', less: 'css',
  html: 'markup', xml: 'markup', svg: 'markup', vue: 'markup',
  json: 'json', jsonc: 'json', json5: 'json',
  diff: 'diff', patch: 'diff',
};

const KEYWORDS = new Set((
  'abstract and as assert async await break case catch class const continue def default defer del do elif else ' +
  'enum except export extends extern false final finally fn for foreach from func function go goto if impl implements ' +
  'import in instanceof interface is lambda let loop match mod module mut namespace new nil none None not null or ' +
  'override package pass private protected pub public raise readonly return self Self static struct super switch then ' +
  'this throw throws trait true True False try type typeof undefined union unless unsafe until use using var void ' +
  'when where while with yield fi esac done local echo export select insert update delete into values set create ' +
  'table alter drop index primary key references join left right inner outer on group by order having limit ' +
  'begin end local function nil elseif repeat'
).split(' '));

function tokenPattern(family: Family): RegExp | null {
  const str = String.raw`"(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*'`;
  const num = String.raw`\b(?:0[xXbBoO][\da-fA-F_]+|\d[\d_]*(?:\.\d+)?(?:[eE][+-]?\d+)?)\b`;
  const word = String.raw`[A-Za-z_$][\w$]*`;
  switch (family) {
    case 'c':
      return new RegExp(String.raw`(\/\/[^\n]*|\/\*[\s\S]*?\*\/)|(${str}|\x60(?:\\.|[^\x60\\])*\x60)|(${num})|(${word})`, 'g');
    case 'hash':
      return new RegExp(String.raw`((?:^|(?<=\s))#[^\n]*)|(${str})|(${num})|(${word})`, 'g');
    case 'sql':
      return new RegExp(String.raw`(--[^\n]*|\/\*[\s\S]*?\*\/)|(${str})|(${num})|(${word})`, 'g');
    case 'css':
      return new RegExp(String.raw`(\/\*[\s\S]*?\*\/)|(${str})|(#[\da-fA-F]{3,8}\b|-?\d+(?:\.\d+)?(?:px|em|rem|%|vh|vw|s|ms|deg)?)|(@[\w-]+|!important)`, 'g');
    case 'markup':
      return new RegExp(String.raw`(<!--[\s\S]*?-->)|(${str})|()(<\/?[\w:-]+|\/?>)`, 'g');
    case 'json':
      return new RegExp(String.raw`()("(?:\\.|[^"\\\n])*")|(-?${num})|(\b(?:true|false|null)\b)`, 'g');
    case 'diff':
      return null;
  }
}

function highlight(lang: string, body: string): ReactNode {
  const family = FAMILY[lang];
  if (family === undefined) return body;
  if (family === 'diff') {
    return body.split('\n').map((line, j, all) => {
      const kind = /^(\+\+\+|---|@@|diff |index )/.test(line) ? 'meta' : line.startsWith('+') ? 'add' : line.startsWith('-') ? 'del' : null;
      const nl = j < all.length - 1 ? '\n' : '';
      return kind === null ? line + nl : <span key={j} className={`oo-tok-${kind}`}>{line}{nl}</span>;
    });
  }
  const re = tokenPattern(family);
  if (re === null) return body;
  const out: ReactNode[] = [];
  let last = 0;
  let k = 0;
  for (const m of body.matchAll(re)) {
    const at = m.index ?? 0;
    const [, comment, str, num, word] = m;
    let cls: string | null = null;
    if (comment) cls = 'comment';
    else if (str) cls = 'string';
    else if (num) cls = 'number';
    else if (word) {
      // Code families match every identifier; only keywords are coloured. Others match only what they colour.
      const code = family === 'c' || family === 'hash' || family === 'sql';
      const known = KEYWORDS.has(word) || (family === 'sql' && KEYWORDS.has(word.toLowerCase()));
      cls = !code || known ? 'keyword' : null;
    }
    if (cls === null) continue;
    if (at > last) out.push(body.slice(last, at));
    out.push(<span key={k++} className={`oo-tok-${cls}`}>{m[0]}</span>);
    last = at + m[0].length;
  }
  if (last < body.length) out.push(body.slice(last));
  return out;
}
