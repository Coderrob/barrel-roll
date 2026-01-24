import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { safeStringify } from './format.js';

describe('safeStringify', () => {
  it('should return the original string when given a string', () => {
    assert.strictEqual(safeStringify('hello'), 'hello');
  });

  it('should return an empty string when given an empty string', () => {
    assert.strictEqual(safeStringify(''), '');
  });

  it('should return JSON stringified number', () => {
    assert.strictEqual(safeStringify(42), '42');
  });

  it('should return JSON stringified boolean', () => {
    assert.strictEqual(safeStringify(true), 'true');
    assert.strictEqual(safeStringify(false), 'false');
  });

  it('should return JSON stringified null', () => {
    assert.strictEqual(safeStringify(null), 'null');
  });

  it('should return JSON stringified object', () => {
    assert.strictEqual(safeStringify({ foo: 'bar' }), '{"foo":"bar"}');
  });

  it('should return JSON stringified array', () => {
    assert.strictEqual(safeStringify([1, 2, 3]), '[1,2,3]');
  });

  it('should return "undefined" for undefined value', () => {
    assert.strictEqual(safeStringify(undefined), undefined);
  });

  it('should fallback to String() for circular references', () => {
    const circular: Record<string, unknown> = {};
    circular.self = circular;
    assert.strictEqual(safeStringify(circular), '[object Object]');
  });

  it('should handle BigInt by falling back to String()', () => {
    assert.strictEqual(safeStringify(BigInt(123)), '123');
  });

  it('should return JSON stringified nested object', () => {
    const nested = { a: { b: { c: 1 } } };
    assert.strictEqual(safeStringify(nested), '{"a":{"b":{"c":1}}}');
  });
});
