// @vitest-environment jsdom

import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Markdown, type MarkdownBlock } from '../../src/ui/display/Markdown.js';

const md = (text: string): HTMLElement => render(<Markdown text={text} />).container.firstElementChild as HTMLElement;

describe('Markdown', () => {
  it('carries the class its stylesheet styles', () => {
    expect(md('x').classList.contains('oo-markdown')).toBe(true);
  });

  it('shows where a web link goes on hover, and opens it outside the page', () => {
    const root = md('An [Agent Host Protocol](https://github.com/microsoft/agent-host-protocol) server, <https://ahpio.com> and https://example.com/x.');
    const links = Array.from(root.querySelectorAll('a'));
    expect(links.map((a) => a.getAttribute('title'))).toEqual(['https://github.com/microsoft/agent-host-protocol', 'https://ahpio.com', 'https://example.com/x']);
    expect(links.every((a) => a.target === '_blank')).toBe(true);
  });

  it('leaves a local link without a hover URL', () => {
    const link = md('[the guide](docs/guide.md)').querySelector('a')!;
    expect(link.hasAttribute('title')).toBe(false);
  });

  it('draws an image with the src as written, or through the host when it gives `image`', () => {
    expect(md('![logo](docs/logo.png)').querySelector('img')?.getAttribute('src')).toBe('docs/logo.png');
    const drawn = render(<Markdown text="![logo](docs/logo.png)" image={(src, alt) => <span data-src={src}>{alt}</span>} />).container;
    expect(drawn.querySelector('img')).toBeNull();
    expect(drawn.querySelector('[data-src]')?.getAttribute('data-src')).toBe('docs/logo.png');
  });

  it('renders a table with its alignment', () => {
    const root = md('| Name | Count |\n| :--- | ---: |\n| a | 1 |\n| `b|c` | 2 |');
    expect(root.querySelectorAll('th')).toHaveLength(2);
    const cells = Array.from(root.querySelectorAll('tbody td')).map((td) => td.textContent);
    expect(cells).toEqual(['a', '1', 'b|c', '2']);
    expect((root.querySelector('tbody td:nth-child(2)') as HTMLElement).style.textAlign).toBe('right');
  });

  it('renders numbered, nested and task lists', () => {
    const root = md('3. three\n4. four\n   - inner\n   - [x] done\n\n- [ ] todo');
    const ol = root.querySelector('ol')!;
    expect(ol.getAttribute('start')).toBe('3');
    expect(ol.querySelectorAll(':scope > li')).toHaveLength(2);
    expect(ol.querySelector('li ul')?.querySelectorAll('li')).toHaveLength(2);
    const boxes = Array.from(root.querySelectorAll('input[type=checkbox]')) as HTMLInputElement[];
    expect(boxes.map((b) => b.checked)).toEqual([true, false]);
  });

  it('renders quotes, rules, headings to h6 and strikethrough', () => {
    const root = md('> quoted **bold**\n\n---\n\n###### small\n\n~~gone~~');
    expect(root.querySelector('blockquote strong')?.textContent).toBe('bold');
    expect(root.querySelector('hr')).not.toBeNull();
    expect(root.querySelector('h6')?.textContent).toBe('small');
    expect(root.querySelector('del')?.textContent).toBe('gone');
  });

  it('colours code by language and leaves unknown languages plain', () => {
    const root = md('```ts\nconst a = "x"; // note\n```\n\n```zz\nconst a\n```');
    const [ts, zz] = Array.from(root.querySelectorAll('pre'));
    expect(ts!.querySelector('.oo-tok-keyword')?.textContent).toBe('const');
    expect(ts!.querySelector('.oo-tok-string')?.textContent).toBe('"x"');
    expect(ts!.querySelector('.oo-tok-comment')?.textContent).toBe('// note');
    expect(ts!.textContent).toBe('const a = "x"; // note');
    expect(zz!.querySelector('span')).toBeNull();
  });

  it('marks links as web or local, and refuses script URLs', () => {
    const root = md('[site](https://x.dev) [file](src/a.ts#L3) [bad](javascript:alert(1)) <https://y.dev> see https://z.dev.');
    const links = Array.from(root.querySelectorAll('a'));
    expect(links.map((a) => [a.getAttribute('href'), a.dataset['kind']])).toEqual([
      ['https://x.dev', 'web'],
      ['src/a.ts#L3', 'local'],
      ['https://y.dev', 'web'],
      ['https://z.dev', 'web'],
    ]);
    expect(root.textContent).toContain('bad');
  });

  it('keeps snake_case and escapes as text', () => {
    const root = md('a snake_case_name and \\*not em\\*');
    expect(root.querySelector('em')).toBeNull();
    expect(root.textContent).toBe('a snake_case_name and *not em*');
  });

  it('numbers footnotes and lists them at the end', () => {
    const root = md('Claim[^src].\n\n[^src]: The source.');
    expect(root.querySelector('sup')?.textContent).toBe('1');
    expect(root.querySelector('.oo-markdown__notes li')?.textContent).toBe('The source.');
  });

  describe('a block hook', () => {
    /** The blocks the hook is given, drawing none of them. */
    const offered = (text: string): MarkdownBlock[] => {
      const seen: MarkdownBlock[] = [];
      render(<Markdown text={text} block={(one) => { seen.push(one); return undefined; }} />);
      return seen;
    };

    it('is given a fenced block with its language, the rest of its info and its body, and draws what it returns', () => {
      expect(offered('```chart title="Usage"\na 1\n```')).toEqual([{ kind: 'code', lang: 'chart', meta: 'title="Usage"', body: 'a 1' }]);
      const drawn = render(<Markdown text={'```mermaid\nA --> B\n```'} block={(one) => (one.kind === 'code' ? <svg data-lang={one.lang} /> : undefined)} />).container;
      expect(drawn.querySelector('svg')?.getAttribute('data-lang')).toBe('mermaid');
      expect(drawn.querySelector('pre')).toBeNull();
    });

    it('leaves a block to scena when it returns undefined', () => {
      const root = render(<Markdown text={'```js\nconst a = 1;\n```'} block={() => undefined} />).container;
      expect(root.querySelector('pre code')?.textContent).toBe('const a = 1;');
    });

    it('reads a leaf directive, its label and its attributes as HTML reads them', () => {
      expect(offered('::gauge[Tokens]{#t .wide .big value=$/usage/tokens max="100000" label=\'a b\' hidden}')).toEqual([{
        kind: 'directive', type: 'leaf', name: 'gauge', label: 'Tokens', body: '',
        attributes: { id: 't', class: 'wide big', value: '$/usage/tokens', max: '100000', label: 'a b', hidden: '' },
      }]);
    });

    it('nests containers with more colons outside, each with its body as written', () => {
      const text = '::::card{title="Today"}\n:::row\n::datatable{rows=x-ahpd-kind://search-results}\n:::\n::::\nafter';
      const blocks = offered(text);
      expect(blocks.map((one) => (one.kind === 'directive' ? `${one.type}:${one.name}` : one.kind))).toEqual(['container:card', 'container:row', 'leaf:datatable']);
      const card = blocks[0] as Extract<MarkdownBlock, { kind: 'directive' }>;
      expect(card.attributes).toEqual({ title: 'Today' });
      expect(card.body).toBe(':::row\n::datatable{rows=x-ahpd-kind://search-results}\n:::');
    });

    it('reads what a container holds when the hook leaves the container to scena', () => {
      const names: string[] = [];
      const root = render(
        <Markdown
          text={'::::card\n:::row\nSome **text**\n:::\n::::'}
          block={(one) => { if (one.kind === 'directive') names.push(one.name); return undefined; }}
        />,
      ).container;
      expect(names).toEqual(['card', 'row']);
      expect(root.querySelector('strong')?.textContent).toBe('text');
      expect(Array.from(root.querySelectorAll('p')).map((p) => p.textContent)).toEqual(['::::card', ':::row', 'Some text', ':::', '::::']);
    });

    it('does not close a container on colons inside a code fence, and runs one with no close to the end', () => {
      const card = offered('::::card\n```\n::::\n```\n::::')[0] as Extract<MarkdownBlock, { kind: 'directive' }>;
      expect(card.body).toBe('```\n::::\n```');
      const open = offered(':::note\nstill inside')[0] as Extract<MarkdownBlock, { kind: 'directive' }>;
      expect(open.body).toBe('still inside');
    });

    it('ends a paragraph at a directive, and reads one inside a list or a quote', () => {
      expect(offered('text\n::gauge\n\n- item\n\n  ::chart\n\n> ::note').map((one) => (one.kind === 'directive' ? one.name : one.kind))).toEqual(['gauge', 'chart', 'note']);
    });

    it('is not used for directives without a hook: their lines stay text, as before', () => {
      const root = md(':::card\ntext\n:::');
      expect(root.querySelectorAll('p')).toHaveLength(1);
      expect(root.textContent).toBe(':::card\ntext\n:::'.replace(/\n/g, ''));
    });
  });
});
