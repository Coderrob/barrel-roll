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

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { splitAndClean, sortAlphabetically } from './string.js';

describe('string utils', () => {
  describe('splitAndClean', () => {
    it('should split by default comma delimiter, trim, and remove empty fragments', () => {
      assert.deepStrictEqual(splitAndClean('a, b , c'), ['a', 'b', 'c']);
      assert.deepStrictEqual(splitAndClean('a,,b, ,c'), ['a', 'b', 'c']);
    });

    it('should split by custom string delimiter', () => {
      assert.deepStrictEqual(splitAndClean('a;b;c', ';'), ['a', 'b', 'c']);
    });

    it('should split by RegExp delimiter', () => {
      assert.deepStrictEqual(splitAndClean('a1b2c', /\d/), ['a', 'b', 'c']);
    });

    it('should handle empty string', () => {
      assert.deepStrictEqual(splitAndClean(''), []);
    });

    it('should handle string with only delimiters and spaces', () => {
      assert.deepStrictEqual(splitAndClean(', , ,'), []);
    });

    it('should handle no splits needed', () => {
      assert.deepStrictEqual(splitAndClean('abc'), ['abc']);
    });
  });

  describe('sortAlphabetically', () => {
    it('should sort strings alphabetically', () => {
      assert.deepStrictEqual(sortAlphabetically(['c', 'a', 'b']), ['a', 'b', 'c']);
    });

    it('should handle empty array', () => {
      assert.deepStrictEqual(sortAlphabetically([]), []);
    });

    it('should handle single item', () => {
      assert.deepStrictEqual(sortAlphabetically(['a']), ['a']);
    });

    it('should sort with locale', () => {
      assert.deepStrictEqual(sortAlphabetically(['ä', 'a'], 'de'), ['a', 'ä']);
    });

    it('should sort with options', () => {
      assert.deepStrictEqual(sortAlphabetically(['A', 'a'], undefined, { sensitivity: 'base' }), [
        'A',
        'a',
      ]);
    });

    it('should handle iterable input', () => {
      assert.deepStrictEqual(sortAlphabetically(new Set(['c', 'a', 'b'])), ['a', 'b', 'c']);
    });
  });
});
