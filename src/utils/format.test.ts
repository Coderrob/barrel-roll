/*
 * Copyright 2025 Robert Lindley
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { safeStringify } from './format.js';

describe('format utils', () => {
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

    it('should return an empty string for undefined value', () => {
      assert.strictEqual(safeStringify(undefined), '');
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
});
