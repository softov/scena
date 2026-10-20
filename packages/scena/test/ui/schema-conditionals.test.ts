import { describe, expect, it } from 'vitest';
import { allowedKeys, matchesSchema, resolveConditionals, type JsonSchemaField, type JsonSchemaObject } from '../../src/ui/forms/schema-walk.js';

/** A row whose kind narrows its limits' measures and its match's keys, as ahpd's `policy:` manifest does. */
const KINDS: Record<string, { measures: string[]; matches: string[] }> = {
  model: { measures: ['usd', 'tokens'], matches: ['model', 'proxy'] },
  agent: { measures: ['usd', 'turns'], matches: ['agent'] },
};
const lines: JsonSchemaField = { type: 'array', items: { type: 'string' } };
const POLICY: JsonSchemaObject = {
  type: 'object',
  properties: {
    kind: { type: 'string', title: 'Kind', enum: ['model', 'agent'] },
    match: { type: 'object', title: 'Match', properties: { model: { ...lines, title: 'Models' }, proxy: { ...lines, title: 'Proxies' }, agent: { ...lines, title: 'Agents' } } },
    limits: { type: 'array', title: 'Limits', items: { type: 'object', properties: { measure: { type: 'string', title: 'Measure', enum: ['usd', 'tokens', 'turns'] } } } },
  },
  required: ['kind'],
  allOf: Object.entries(KINDS).map(([kind, { measures, matches }]) => ({
    if: { properties: { kind: { const: kind } }, required: ['kind'] },
    then: { properties: { limits: { items: { properties: { measure: { enum: measures } } } }, match: { propertyNames: { enum: matches } } } },
  })),
};

const measureOf = (schema: JsonSchemaObject): string[] | undefined =>
  ((schema.properties?.limits?.items as JsonSchemaField).properties?.measure)?.enum;

describe('matchesSchema', () => {
  it('checks const, enum, required and properties, and lets a non-object through required', () => {
    const test: JsonSchemaField = { properties: { kind: { const: 'model' } }, required: ['kind'] };
    expect(matchesSchema(test, { kind: 'model' })).toBe(true);
    expect(matchesSchema(test, { kind: 'agent' })).toBe(false);
    expect(matchesSchema(test, {})).toBe(false);
    expect(matchesSchema({ properties: { kind: { const: 'model' } } }, {})).toBe(true);
    expect(matchesSchema({ enum: ['a', 'b'] }, 'b')).toBe(true);
    expect(matchesSchema({ required: ['kind'] }, 'text')).toBe(true);
  });
});

describe('resolveConditionals', () => {
  it('folds in the branch the value picks: fewer measures, fewer match keys', () => {
    const agent = resolveConditionals(POLICY, { kind: 'agent' });
    expect(measureOf(agent)).toEqual(['usd', 'turns']);
    expect(allowedKeys(agent.properties!.match!)).toEqual(['agent']);
    expect(agent.allOf).toBeUndefined();
    const model = resolveConditionals(POLICY, { kind: 'model' });
    expect(measureOf(model)).toEqual(['usd', 'tokens']);
    expect(allowedKeys(model.properties!.match!)).toEqual(['model', 'proxy']);
  });

  it('leaves the union when no branch holds', () => {
    const none = resolveConditionals(POLICY, {});
    expect(measureOf(none)).toEqual(['usd', 'tokens', 'turns']);
    expect(allowedKeys(none.properties!.match!)).toBeUndefined();
  });

  it('reads a branch that lists its own properties and takes no others', () => {
    const schema: JsonSchemaObject = {
      type: 'object',
      properties: { kind: { type: 'string' }, match: { type: 'object', properties: { model: lines, agent: lines } } },
      if: { properties: { kind: { const: 'agent' } }, required: ['kind'] },
      then: { properties: { match: { properties: { agent: lines }, additionalProperties: false } } },
    };
    expect(allowedKeys(resolveConditionals(schema, { kind: 'agent' }).properties!.match!)).toEqual(['agent']);
  });

  it('takes else where the value does not match, and merges a plain allOf entry', () => {
    const schema: JsonSchemaObject = {
      type: 'object',
      properties: { a: { type: 'string' }, b: { type: 'string' } },
      if: { properties: { a: { const: 'x' } }, required: ['a'] },
      then: { required: ['b'] },
      else: { properties: { b: { enum: ['one'] } } },
      allOf: [{ required: ['a'] }],
    };
    expect(resolveConditionals(schema, { a: 'x' }).required).toEqual(['a', 'b']);
    const other = resolveConditionals(schema, { a: 'y' });
    expect(other.required).toEqual(['a']);
    expect(other.properties!.b!.enum).toEqual(['one']);
  });

  it('keeps a branch\'s own nested condition for the object it sits on', () => {
    const schema: JsonSchemaObject = {
      type: 'object',
      properties: { kind: { type: 'string' }, match: { type: 'object', properties: { mode: { type: 'string' } } } },
      allOf: [{ properties: { match: { if: { required: ['mode'] }, then: { required: ['x'] } } } }],
    };
    const match = resolveConditionals(schema, {}).properties!.match!;
    expect(resolveConditionals(match, { mode: 'a' }).required).toEqual(['x']);
  });
});
