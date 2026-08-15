import { Fragment, type CSSProperties, type ReactNode } from 'react';
import './Markdown.css';

// Minimal Markdown renderer. No external deps. Supports:
//   - Headings (#, ##, ###)
//   - Paragraphs, soft breaks
//   - Bold **x**, italic *x*, inline `code`
//   - Bullet lists (- / *)
//   - Fenced code blocks (```)
//   - Hyperlinks [text](url)
// Anything more should use a real Markdown lib in app code.
export interface MarkdownProps {
  text?: string;
  style?: CSSProperties;
  className?: string;
}

export function Markdown({ text = '', style, className }: MarkdownProps) {
  const blocks = parseBlocks(text);
  return (
    <div
      className={['oo-kdown', className].filter(Boolean).join(' ')}
      style={style}
    >
      {blocks.map((b, i) => renderBlock(b, i))}
    </div>
  );
}

type Block =
  | { kind: 'h'; level: 1 | 2 | 3; text: string }
  | { kind: 'p'; lines: string[] }
  | { kind: 'ul'; items: string[] }
  | { kind: 'code'; lang: string; body: string };

function parseBlocks(text: string): Block[] {
  const blocks: Block[] = [];
  const lines = text.split(/\r?\n/);
  let i = 0;
  while (i < lines.length) {
    const line = lines[i] ?? '';
    if (line.startsWith('```')) {
      const lang = line.slice(3).trim();
      const body: string[] = [];
      i += 1;
      while (i < lines.length && !(lines[i] ?? '').startsWith('```')) {
        body.push(lines[i] ?? '');
        i += 1;
      }
      i += 1; // consume closing fence
      blocks.push({ kind: 'code', lang, body: body.join('\n') });
      continue;
    }
    if (line.startsWith('### ')) { blocks.push({ kind: 'h', level: 3, text: line.slice(4) }); i += 1; continue; }
    if (line.startsWith('## '))  { blocks.push({ kind: 'h', level: 2, text: line.slice(3) }); i += 1; continue; }
    if (line.startsWith('# '))   { blocks.push({ kind: 'h', level: 1, text: line.slice(2) }); i += 1; continue; }
    if (/^[-*] /.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*] /.test(lines[i] ?? '')) {
        items.push((lines[i] ?? '').slice(2));
        i += 1;
      }
      blocks.push({ kind: 'ul', items });
      continue;
    }
    if (line.trim() === '') { i += 1; continue; }
    // Paragraph — gather consecutive non-empty, non-special lines.
    const pl: string[] = [];
    while (
      i < lines.length &&
      (lines[i] ?? '').trim() !== '' &&
      !(lines[i] ?? '').startsWith('#') &&
      !/^[-*] /.test(lines[i] ?? '') &&
      !(lines[i] ?? '').startsWith('```')
    ) {
      pl.push(lines[i] ?? '');
      i += 1;
    }
    if (pl.length > 0) blocks.push({ kind: 'p', lines: pl });
  }
  return blocks;
}

function renderBlock(b: Block, key: number): ReactNode {
  switch (b.kind) {
    case 'h': {
      const Tag = (`h${b.level}`) as 'h1' | 'h2' | 'h3';
      return <Tag key={key}>{inline(b.text)}</Tag>;
    }
    case 'ul':
      return (
        <ul key={key}>
          {b.items.map((it, j) => <li key={j}>{inline(it)}</li>)}
        </ul>
      );
    case 'code':
      return (
        <pre key={key} data-lang={b.lang || undefined}>
          <code>{b.body}</code>
        </pre>
      );
    case 'p':
      return (
        <p key={key}>
          {b.lines.map((l, j) => (
            <Fragment key={j}>
              {inline(l)}
              {j < b.lines.length - 1 ? <br /> : null}
            </Fragment>
          ))}
        </p>
      );
  }
}

// Inline parser — runs left-to-right, picking the earliest match for each
// supported syntax (links / bold / italic / inline code). Plain text is
// accumulated between matches.
function inline(s: string): ReactNode {
  const out: ReactNode[] = [];
  let i = 0;
  let buf = '';
  function flushBuf(): void { if (buf) { out.push(buf); buf = ''; } }
  while (i < s.length) {
    // [text](url)
    if (s[i] === '[') {
      const close = s.indexOf(']', i + 1);
      if (close > 0 && s[close + 1] === '(') {
        const urlEnd = s.indexOf(')', close + 2);
        if (urlEnd > 0) {
          flushBuf();
          out.push(
            <a key={i} href={s.slice(close + 2, urlEnd)} target="_blank" rel="noreferrer noopener">
              {s.slice(i + 1, close)}
            </a>,
          );
          i = urlEnd + 1;
          continue;
        }
      }
    }
    if (s.slice(i, i + 2) === '**') {
      const end = s.indexOf('**', i + 2);
      if (end > 0) {
        flushBuf();
        out.push(<strong key={i}>{s.slice(i + 2, end)}</strong>);
        i = end + 2;
        continue;
      }
    }
    if (s[i] === '*' && s[i + 1] !== '*') {
      const end = s.indexOf('*', i + 1);
      if (end > 0) {
        flushBuf();
        out.push(<em key={i}>{s.slice(i + 1, end)}</em>);
        i = end + 1;
        continue;
      }
    }
    if (s[i] === '`') {
      const end = s.indexOf('`', i + 1);
      if (end > 0) {
        flushBuf();
        out.push(<code key={i}>{s.slice(i + 1, end)}</code>);
        i = end + 1;
        continue;
      }
    }
    buf += s[i];
    i += 1;
  }
  flushBuf();
  return out;
}
