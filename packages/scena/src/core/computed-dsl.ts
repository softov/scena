// Compiles a computed `select` STRING into an evaluator over the computed's
// `from` inputs. Implements the 00-DECISIONS whitelist — no general eval(), no
// dependencies. Function `select`s bypass this file entirely.
//
// Grammar (one statement):
//   countWhere(<expr>) | sumBy(<expr>) | filter(<expr>) | map(<expr>)
//   | length(<expr>)   | <expr>
//
//   <expr>: identifiers (with `.` member access), number / string / true /
//   false / null literals, `! - ` unary, `* /`, `+ -`, `== != < > <= >=`,
//   `&& ||`, parentheses.
//
// Inputs object: { [fromPath]: value }. Collection functions (countWhere /
// sumBy / filter / map) iterate the first ARRAY input (a wildcard `from`
// expands to an array upstream); inside their <expr>, bare identifiers resolve
// against the current item (its own props, plus `item` / `value` = the item).
// `length` and bare <expr> resolve identifiers against the inputs, aliased by
// each path's LAST segment and by positional `$0`, `$1`, … (and `value` =
// first input).

export type SelectFn = (inputs: Record<string, unknown>) => unknown;

const COLLECTION_FNS = new Set(['countWhere', 'sumBy', 'filter', 'map']);

export function compileSelect(select: string): SelectFn {
  const src = select.trim();
  const fnMatch = /^([A-Za-z_$][\w$]*)\(([\s\S]*)\)$/.exec(src);

  if (fnMatch && (COLLECTION_FNS.has(fnMatch[1]!) || fnMatch[1] === 'length')) {
    const fn = fnMatch[1]!;
    const inner = parse(fnMatch[2]!);

    if (fn === 'length') {
      return (inputs) => {
        const v = evalNode(inner, inputsScope(inputs));
        if (Array.isArray(v) || typeof v === 'string') return v.length;
        if (v && typeof v === 'object') return Object.keys(v).length;
        return 0;
      };
    }

    return (inputs) => {
      const coll = pickCollection(inputs);
      switch (fn) {
        case 'countWhere':
          return coll.reduce<number>((n, item) => (truthy(evalNode(inner, itemScope(item))) ? n + 1 : n), 0);
        case 'sumBy':
          return coll.reduce<number>((s, item) => s + toNum(evalNode(inner, itemScope(item))), 0);
        case 'filter':
          return coll.filter((item) => truthy(evalNode(inner, itemScope(item))));
        case 'map':
          return coll.map((item) => evalNode(inner, itemScope(item)));
        default:
          return undefined;
      }
    };
  }

  if (fnMatch) {
    throw new Error(`computed: unknown select function "${fnMatch[1]}(…)"`);
  }

  const node = parse(src);
  return (inputs) => evalNode(node, inputsScope(inputs));
}

// ── scopes ──────────────────────────────────────────────────────────────────
function pickCollection(inputs: Record<string, unknown>): unknown[] {
  for (const v of Object.values(inputs)) if (Array.isArray(v)) return v;
  return [];
}

function itemScope(item: unknown): Record<string, unknown> {
  if (item && typeof item === 'object') {
    return { ...(item as Record<string, unknown>), item, value: item };
  }
  return { item, value: item };
}

function lastSegment(path: string): string {
  const parts = path.split('/');
  return parts[parts.length - 1] || path;
}

function inputsScope(inputs: Record<string, unknown>): Record<string, unknown> {
  const scope: Record<string, unknown> = {};
  let i = 0;
  for (const [path, value] of Object.entries(inputs)) {
    scope[lastSegment(path)] = value;
    scope[`$${i}`] = value;
    if (i === 0) scope.value = value;
    i++;
  }
  return scope;
}

// ── tokenizer ────────────────────────────────────────────────────────────────
type Tok =
  | { t: 'num'; v: number }
  | { t: 'str'; v: string }
  | { t: 'id'; v: string }
  | { t: 'op'; v: string };

const OPS2 = ['==', '!=', '<=', '>=', '&&', '||'];
const OPS1 = ['<', '>', '!', '+', '-', '*', '/', '(', ')', '.', ','];

function tokenize(src: string): Tok[] {
  const out: Tok[] = [];
  let i = 0;
  while (i < src.length) {
    const c = src[i]!;
    if (c === ' ' || c === '\t' || c === '\n' || c === '\r') { i++; continue; }
    if (c === '"' || c === "'") {
      let j = i + 1;
      let s = '';
      while (j < src.length && src[j] !== c) { s += src[j]; j++; }
      if (j >= src.length) throw new Error(`computed: unterminated string in select`);
      out.push({ t: 'str', v: s });
      i = j + 1;
      continue;
    }
    if (/[0-9]/.test(c) || (c === '.' && /[0-9]/.test(src[i + 1] ?? ''))) {
      let j = i;
      while (j < src.length && /[0-9.]/.test(src[j]!)) j++;
      out.push({ t: 'num', v: Number(src.slice(i, j)) });
      i = j;
      continue;
    }
    if (/[A-Za-z_$]/.test(c)) {
      let j = i;
      while (j < src.length && /[\w$]/.test(src[j]!)) j++;
      out.push({ t: 'id', v: src.slice(i, j) });
      i = j;
      continue;
    }
    const two = src.slice(i, i + 2);
    if (OPS2.includes(two)) { out.push({ t: 'op', v: two }); i += 2; continue; }
    if (OPS1.includes(c)) { out.push({ t: 'op', v: c }); i++; continue; }
    throw new Error(`computed: unexpected character "${c}" in select`);
  }
  return out;
}

// ── parser (recursive descent) ────────────────────────────────────────────────
type Node =
  | { k: 'lit'; v: unknown }
  | { k: 'id'; v: string }
  | { k: 'member'; obj: Node; prop: string }
  | { k: 'unary'; op: string; arg: Node }
  | { k: 'bin'; op: string; l: Node; r: Node };

function parse(src: string): Node {
  const toks = tokenize(src);
  let pos = 0;
  const peek = () => toks[pos];
  const eat = (v?: string): Tok => {
    const t = toks[pos];
    if (!t) throw new Error(`computed: unexpected end of select`);
    if (v && !(t.t === 'op' && t.v === v)) throw new Error(`computed: expected "${v}"`);
    pos++;
    return t;
  };
  const isOp = (v: string) => { const t = peek(); return !!t && t.t === 'op' && t.v === v; };

  function primary(): Node {
    const t = peek();
    if (!t) throw new Error(`computed: unexpected end of select`);
    if (isOp('!') || isOp('-')) { const op = (eat() as { v: string }).v; return { k: 'unary', op, arg: primary() }; }
    if (isOp('(')) { eat('('); const e = orExpr(); eat(')'); return member(e); }
    if (t.t === 'num') { eat(); return { k: 'lit', v: t.v }; }
    if (t.t === 'str') { eat(); return { k: 'lit', v: t.v }; }
    if (t.t === 'id') {
      eat();
      if (t.v === 'true') return { k: 'lit', v: true };
      if (t.v === 'false') return { k: 'lit', v: false };
      if (t.v === 'null') return { k: 'lit', v: null };
      return member({ k: 'id', v: t.v });
    }
    throw new Error(`computed: unexpected token in select`);
  }
  function member(base: Node): Node {
    let node = base;
    while (isOp('.')) {
      eat('.');
      const id = eat();
      if (id.t !== 'id') throw new Error(`computed: expected property name after "."`);
      node = { k: 'member', obj: node, prop: id.v };
    }
    return node;
  }
  function binLevel(next: () => Node, ops: string[]): Node {
    let left = next();
    while (peek() && peek()!.t === 'op' && ops.includes(peek()!.v as string)) {
      const op = (eat() as { v: string }).v;
      left = { k: 'bin', op, l: left, r: next() };
    }
    return left;
  }
  const mul = () => binLevel(primary, ['*', '/']);
  const add = () => binLevel(mul, ['+', '-']);
  const cmp = () => binLevel(add, ['==', '!=', '<', '>', '<=', '>=']);
  const and = () => binLevel(cmp, ['&&']);
  const orExpr = () => binLevel(and, ['||']);

  const result = orExpr();
  if (pos !== toks.length) throw new Error(`computed: trailing tokens in select`);
  return result;
}

// ── evaluator ─────────────────────────────────────────────────────────────────
function evalNode(n: Node, scope: Record<string, unknown>): unknown {
  switch (n.k) {
    case 'lit':
      return n.v;
    case 'id':
      return scope[n.v];
    case 'member': {
      const o = evalNode(n.obj, scope);
      if (o == null) return undefined;
      return (o as Record<string, unknown>)[n.prop];
    }
    case 'unary': {
      const v = evalNode(n.arg, scope);
      return n.op === '!' ? !truthy(v) : -toNum(v);
    }
    case 'bin': {
      const l = evalNode(n.l, scope);
      if (n.op === '&&') return truthy(l) ? evalNode(n.r, scope) : l;
      if (n.op === '||') return truthy(l) ? l : evalNode(n.r, scope);
      const r = evalNode(n.r, scope);
      switch (n.op) {
        case '==': return l === r;
        case '!=': return l !== r;
        case '<': return (l as number) < (r as number);
        case '>': return (l as number) > (r as number);
        case '<=': return (l as number) <= (r as number);
        case '>=': return (l as number) >= (r as number);
        case '+': return typeof l === 'string' || typeof r === 'string'
          ? String(l) + String(r)
          : toNum(l) + toNum(r);
        case '-': return toNum(l) - toNum(r);
        case '*': return toNum(l) * toNum(r);
        case '/': return toNum(l) / toNum(r);
        default: return undefined;
      }
    }
  }
}

function truthy(v: unknown): boolean {
  return !!v;
}
function toNum(v: unknown): number {
  return typeof v === 'number' ? v : Number(v);
}
