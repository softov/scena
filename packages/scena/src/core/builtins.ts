import type { Disposable } from '../sdk/disposable.js';
import type { Scena } from '../sdk/scena.js';
import type { CommandContext } from '../sdk/command.js';
import { combineDisposables } from '../sdk/disposable.js';

// The 14 a2ui v0.10 basic-catalog functions, registered as commands at
// createScena() time. All declare callableFrom: 'clientOnly' semantics
// (dispatch: 'client' here — they don't round-trip through the socket).

function arg<T>(args: unknown, key: string): T | undefined {
  if (!args || typeof args !== 'object') return undefined;
  return (args as Record<string, unknown>)[key] as T | undefined;
}

function toStr(v: unknown): string {
  return v === null || v === undefined ? '' : String(v);
}
function toNum(v: unknown): number {
  if (typeof v === 'number') return v;
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v);
    if (!Number.isNaN(n)) return n;
  }
  return Number.NaN;
}

const validation = (scena: Scena): Disposable => {
  return combineDisposables(
    scena.commands.register({
      id: 'required',
      title: 'required',
      dispatch: 'client',
      run: (_ctx, a) => {
        const v = arg<unknown>(a, 'value');
        return v !== undefined && v !== null && v !== '';
      },
    }),
    scena.commands.register({
      id: 'regex',
      title: 'regex',
      dispatch: 'client',
      run: (_ctx, a) => {
        const value = toStr(arg(a, 'value'));
        const pattern = toStr(arg(a, 'pattern'));
        const flags = toStr(arg(a, 'flags'));
        if (!pattern) return true;
        try {
          return new RegExp(pattern, flags || undefined).test(value);
        } catch {
          return false;
        }
      },
    }),
    scena.commands.register({
      id: 'length',
      title: 'length',
      dispatch: 'client',
      run: (_ctx, a) => {
        const value = toStr(arg(a, 'value'));
        const min = arg<number>(a, 'min');
        const max = arg<number>(a, 'max');
        if (min !== undefined && value.length < min) return false;
        if (max !== undefined && value.length > max) return false;
        return true;
      },
    }),
    scena.commands.register({
      id: 'numeric',
      title: 'numeric',
      dispatch: 'client',
      run: (_ctx, a) => {
        const n = toNum(arg(a, 'value'));
        return !Number.isNaN(n);
      },
    }),
    scena.commands.register({
      id: 'email',
      title: 'email',
      dispatch: 'client',
      run: (_ctx, a) => {
        const v = toStr(arg(a, 'value'));
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
      },
    }),
  );
};

const format = (scena: Scena): Disposable => {
  return combineDisposables(
    scena.commands.register({
      id: 'formatString',
      title: 'formatString',
      dispatch: 'client',
      run: (_ctx, a) => {
        const template = toStr(arg(a, 'template'));
        const values = (arg<Record<string, unknown>>(a, 'values') ?? {}) as Record<
          string,
          unknown
        >;
        return template.replace(/\{([^}]+)\}/g, (_, k) => toStr(values[k]));
      },
    }),
    scena.commands.register({
      id: 'formatNumber',
      title: 'formatNumber',
      dispatch: 'client',
      run: (_ctx, a) => {
        const n = toNum(arg(a, 'value'));
        if (Number.isNaN(n)) return '';
        const locale = arg<string>(a, 'locale');
        const minimumFractionDigits = arg<number>(a, 'minimumFractionDigits');
        const maximumFractionDigits = arg<number>(a, 'maximumFractionDigits');
        return new Intl.NumberFormat(locale, {
          minimumFractionDigits,
          maximumFractionDigits,
        }).format(n);
      },
    }),
    scena.commands.register({
      id: 'formatCurrency',
      title: 'formatCurrency',
      dispatch: 'client',
      run: (_ctx, a) => {
        const n = toNum(arg(a, 'value'));
        if (Number.isNaN(n)) return '';
        const currency = toStr(arg(a, 'currency')) || 'USD';
        const locale = arg<string>(a, 'locale');
        return new Intl.NumberFormat(locale, {
          style: 'currency',
          currency,
        }).format(n);
      },
    }),
    scena.commands.register({
      id: 'formatDate',
      title: 'formatDate',
      dispatch: 'client',
      run: (_ctx, a) => {
        const v = arg<unknown>(a, 'value');
        if (v === undefined || v === null || v === '') return '';
        const d = v instanceof Date ? v : new Date(v as string | number);
        if (Number.isNaN(d.getTime())) return '';
        const locale = arg<string>(a, 'locale');
        const options = arg<Intl.DateTimeFormatOptions>(a, 'options');
        return new Intl.DateTimeFormat(locale, options).format(d);
      },
    }),
    scena.commands.register({
      id: 'pluralize',
      title: 'pluralize',
      dispatch: 'client',
      run: (_ctx, a) => {
        const count = toNum(arg(a, 'count'));
        const one = toStr(arg(a, 'one'));
        const other = toStr(arg(a, 'other'));
        return count === 1 ? one : other;
      },
    }),
  );
};

const navigation = (scena: Scena): Disposable => {
  return scena.commands.register({
    id: 'openUrl',
    title: 'openUrl',
    dispatch: 'client',
    run: (_ctx: CommandContext, a) => {
      const url = toStr(arg(a, 'url'));
      if (!url) return;
      if (typeof window !== 'undefined') {
        const target = toStr(arg(a, 'target')) || '_blank';
        window.open(url, target);
      }
    },
  });
};

const logic = (scena: Scena): Disposable => {
  return combineDisposables(
    scena.commands.register({
      id: 'and',
      title: 'and',
      dispatch: 'client',
      run: (_ctx, a) => {
        const values = arg<unknown[]>(a, 'values') ?? [];
        return values.every(Boolean);
      },
    }),
    scena.commands.register({
      id: 'or',
      title: 'or',
      dispatch: 'client',
      run: (_ctx, a) => {
        const values = arg<unknown[]>(a, 'values') ?? [];
        return values.some(Boolean);
      },
    }),
    scena.commands.register({
      id: 'not',
      title: 'not',
      dispatch: 'client',
      run: (_ctx, a) => {
        return !arg<unknown>(a, 'value');
      },
    }),
  );
};

export function registerBuiltinFunctions(scena: Scena): Disposable {
  return combineDisposables(
    validation(scena),
    format(scena),
    navigation(scena),
    logic(scena),
  );
}
