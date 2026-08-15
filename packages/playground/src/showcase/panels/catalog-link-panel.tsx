import type { ReactNode } from 'react';
import { Link, resolveLinkHref } from '@softov/scena/ui';
import './catalog-link-panel.css';

// Showcase for the Link component's protocol detection. Each input is
// normalized to a spec href: phone numbers → tel:, emails → mailto:,
// everything else → https:// (existing schemes pass through). The tel:// and
// email:// shorthand inputs are accepted and rewritten to the real scheme.
const EXAMPLES = [
  '+5567981234276',
  '67981234276',
  'tel://+5567981234276',
  'demo@doop.dev',
  'email://demo@doop.dev',
  'doop.dev',
  'docs.doop.dev/guide',
  'https://a2ui.org',
  'mailto:hi@doop.dev',
];

export function CatalogLinkPanel(): ReactNode {
  return (
    <div className="link-demo">
      <header>
        <h2>Catalog — Link</h2>
        <p>
          <code>Link</code> auto-detects the target and normalizes to a spec href: a phone number →{' '}
          <code>tel:</code>, an email → <code>mailto:</code>, anything else → <code>https://</code>.
          Values that already carry a scheme pass through unchanged.
        </p>
      </header>

      <table className="link-demo__table">
        <thead>
          <tr>
            <th>input</th>
            <th>kind</th>
            <th>normalized href</th>
            <th>rendered</th>
          </tr>
        </thead>
        <tbody>
          {EXAMPLES.map((raw) => {
            const r = resolveLinkHref(raw);
            return (
              <tr key={raw}>
                <td><code>{raw}</code></td>
                <td><span className={`link-demo__kind link-demo__kind--${r.kind}`}>{r.kind}</span></td>
                <td><code>{r.href}</code></td>
                <td><Link href={raw} label={raw} /></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
