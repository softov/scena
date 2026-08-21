import type { Disposable } from '../../sdk/disposable.js';
import type { BindingPath } from '../../sdk/component-graph.js';
import type { ReactiveStore } from '../../sdk/reactive-store.js';
import type {
  ContextSnapshot,
  WhenClause,
  WhenEngine,
} from '../../sdk/when.js';
import { combineDisposables, disposableFrom } from '../../sdk/disposable.js';

// Minimal DSL parser for Step 2.
//
// Supported grammar:
//   Expression := OrExpr
//   OrExpr     := AndExpr ('||' AndExpr)*
//   AndExpr    := NotExpr ('&&' NotExpr)*
//   NotExpr    := '!' NotExpr | Atom
//   Atom       := '(' Expression ')' | StringLiteral | Path | Path '==' Value | Path '!=' Value
//   Value      := StringLiteral | NumberLiteral | 'true' | 'false' | 'null'
//
// Function-form clauses bypass the parser.

type Token =
  | { kind: 'path'; value: string }
  | { kind: 'string'; value: string }
  | { kind: 'number'; value: number }
  | { kind: 'bool'; value: boolean }
  | { kind: 'null' }
  | { kind: 'op'; value: '==' | '!=' | '&&' | '||' | '!' | '(' | ')' };

function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < input.length) {
    const ch = input[i]!;
    if (ch === ' ' || ch === '\t' || ch === '\n') {
      i++;
      continue;
    }
    if (ch === '(' || ch === ')') {
      tokens.push({ kind: 'op', value: ch });
      i++;
      continue;
    }
    if (ch === '!' && input[i + 1] === '=') {
      tokens.push({ kind: 'op', value: '!=' });
      i += 2;
      continue;
    }
    if (ch === '=' && input[i + 1] === '=') {
      tokens.push({ kind: 'op', value: '==' });
      i += 2;
      continue;
    }
    if (ch === '&' && input[i + 1] === '&') {
      tokens.push({ kind: 'op', value: '&&' });
      i += 2;
      continue;
    }
    if (ch === '|' && input[i + 1] === '|') {
      tokens.push({ kind: 'op', value: '||' });
      i += 2;
      continue;
    }
    if (ch === '!') {
      tokens.push({ kind: 'op', value: '!' });
      i++;
      continue;
    }
    if (ch === '"' || ch === "'") {
      const quote = ch;
      let j = i + 1;
      let value = '';
      while (j < input.length && input[j] !== quote) {
        if (input[j] === '\\') {
          value += input[j + 1] ?? '';
          j += 2;
        } else {
          value += input[j];
          j++;
        }
      }
      tokens.push({ kind: 'string', value });
      i = j + 1;
      continue;
    }
    // Number / identifier / path. Path can include `:` and `.`.
    let j = i;
    while (
      j < input.length &&
      !' \t\n()!=&|"\''.includes(input[j]!)
    ) {
      j++;
    }
    const word = input.slice(i, j);
    if (/^-?\d+(\.\d+)?$/.test(word)) {
      tokens.push({ kind: 'number', value: Number(word) });
    } else if (word === 'true') tokens.push({ kind: 'bool', value: true });
    else if (word === 'false') tokens.push({ kind: 'bool', value: false });
    else if (word === 'null') tokens.push({ kind: 'null' });
    else tokens.push({ kind: 'path', value: word });
    i = j;
  }
  return tokens;
}

type Ast =
  | { kind: 'literal'; value: unknown }
  | { kind: 'path'; value: BindingPath }
  | { kind: 'eq'; left: Ast; right: Ast }
  | { kind: 'neq'; left: Ast; right: Ast }
  | { kind: 'and'; left: Ast; right: Ast }
  | { kind: 'or'; left: Ast; right: Ast }
  | { kind: 'not'; expr: Ast };

function parse(tokens: Token[]): Ast {
  let pos = 0;
  function peek(): Token | undefined {
    return tokens[pos];
  }
  function consume(): Token {
    return tokens[pos++]!;
  }
  function parseExpression(): Ast {
    return parseOr();
  }
  function parseOr(): Ast {
    let left = parseAnd();
    while (peek()?.kind === 'op' && (peek() as { value: string }).value === '||') {
      consume();
      left = { kind: 'or', left, right: parseAnd() };
    }
    return left;
  }
  function parseAnd(): Ast {
    let left = parseNot();
    while (peek()?.kind === 'op' && (peek() as { value: string }).value === '&&') {
      consume();
      left = { kind: 'and', left, right: parseNot() };
    }
    return left;
  }
  function parseNot(): Ast {
    if (peek()?.kind === 'op' && (peek() as { value: string }).value === '!') {
      consume();
      return { kind: 'not', expr: parseNot() };
    }
    return parseAtom();
  }
  function parseAtom(): Ast {
    const t = consume();
    if (t.kind === 'op' && t.value === '(') {
      const inner = parseExpression();
      const close = consume();
      if (!(close.kind === 'op' && close.value === ')')) {
        throw new Error('when DSL: expected ")"');
      }
      return inner;
    }
    if (t.kind === 'string') return { kind: 'literal', value: t.value };
    if (t.kind === 'number') return { kind: 'literal', value: t.value };
    if (t.kind === 'bool') return { kind: 'literal', value: t.value };
    if (t.kind === 'null') return { kind: 'literal', value: null };
    if (t.kind === 'path') {
      const left: Ast = { kind: 'path', value: t.value as BindingPath };
      const next = peek();
      if (next?.kind === 'op' && (next.value === '==' || next.value === '!=')) {
        consume();
        const right = parseAtom();
        return { kind: next.value === '==' ? 'eq' : 'neq', left, right };
      }
      return left;
    }
    throw new Error(`when DSL: unexpected token ${JSON.stringify(t)}`);
  }
  return parseExpression();
}

function compile(input: string): Ast {
  return parse(tokenize(input));
}

function pathsOf(ast: Ast, out: Set<BindingPath>): void {
  switch (ast.kind) {
    case 'literal':
      return;
    case 'path':
      out.add(ast.value);
      return;
    case 'eq':
    case 'neq':
    case 'and':
    case 'or':
      pathsOf(ast.left, out);
      pathsOf(ast.right, out);
      return;
    case 'not':
      pathsOf(ast.expr, out);
      return;
  }
}

interface Deps {
  store: ReactiveStore;
}

export function createWhenEngine(deps: Deps): WhenEngine {
  const { store } = deps;
  const cache = new Map<string, Ast>();

  function astFor(clause: string): Ast {
    let ast = cache.get(clause);
    if (!ast) {
      ast = compile(clause);
      cache.set(clause, ast);
    }
    return ast;
  }

  function evalAst(ast: Ast, ctx?: ContextSnapshot): unknown {
    switch (ast.kind) {
      case 'literal':
        return ast.value;
      case 'path':
        return ctx?.[ast.value] ?? store.get(ast.value);
      case 'eq':
        return evalAst(ast.left, ctx) === evalAst(ast.right, ctx);
      case 'neq':
        return evalAst(ast.left, ctx) !== evalAst(ast.right, ctx);
      case 'and':
        return Boolean(evalAst(ast.left, ctx)) && Boolean(evalAst(ast.right, ctx));
      case 'or':
        return Boolean(evalAst(ast.left, ctx)) || Boolean(evalAst(ast.right, ctx));
      case 'not':
        return !evalAst(ast.expr, ctx);
    }
  }

  function evaluate(clause: WhenClause, ctx?: ContextSnapshot): boolean {
    if (typeof clause === 'function') return clause(ctx ?? {});
    return Boolean(evalAst(astFor(clause), ctx));
  }

  function dependencies(clause: WhenClause): BindingPath[] {
    if (typeof clause === 'function') return [];
    const set = new Set<BindingPath>();
    pathsOf(astFor(clause), set);
    return [...set];
  }

  function watch(clause: WhenClause, fn: (value: boolean) => void): Disposable {
    let last = evaluate(clause);
    fn(last);
    const deps = dependencies(clause);
    if (deps.length === 0) return disposableFrom(() => {});
    const subs = deps.map((p) =>
      store.subscribe(p, () => {
        const next = evaluate(clause);
        if (next !== last) {
          last = next;
          fn(next);
        }
      }),
    );
    return combineDisposables(...subs);
  }

  return { evaluate, watch, dependencies };
}
