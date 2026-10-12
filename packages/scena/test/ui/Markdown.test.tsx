// @vitest-environment jsdom

import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Markdown } from '../../src/ui/display/Markdown.js';

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
});
