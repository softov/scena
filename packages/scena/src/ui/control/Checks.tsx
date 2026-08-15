import './Checks.css';

// Renders the messages of any failed check rules. Each rule is resolved by
// the ViewMount prop resolver before reaching the component, so `condition`
// here is the materialized truthy/falsy value.
export interface CheckRuleResolved {
  condition: unknown;
  message?: string;
}

export interface ChecksProps {
  checks?: CheckRuleResolved[];
}

export function Checks({ checks }: ChecksProps) {
  if (!checks || checks.length === 0) return null;
  const failed = checks.filter((c) => !c.condition);
  if (failed.length === 0) return null;
  return (
    <div className="oo-checks">
      {failed.map((c, i) => (
        <div key={i} className="oo-checks__item">
          {c.message ?? 'invalid'}
        </div>
      ))}
    </div>
  );
}
