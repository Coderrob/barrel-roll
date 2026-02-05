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
import { isEmptyArray } from '../../../utils/array.js';

/**
 * Formats a value for display in test descriptions.
 */
function formatValue(value: unknown): string {
  return Array.isArray(value) ? `[${value.map(String).join(', ')}]` : String(value);
}

describe('array utils', () => {
  describe('isEmptyArray', () => {
    const cases: ReadonlyArray<[unknown, boolean]> = [
      [null, true],
      [undefined, true],
      [[], true],
      [[1, 2, 3], false],
      [['a'], false],
      [['test'] as readonly string[], false],
      [[] as readonly string[], true],
    ];

    for (const [input, expected] of cases) {
      const description = `should return ${expected} when input is ${formatValue(input)}`;

      it(description, () => {
        assert.strictEqual(isEmptyArray(input as readonly unknown[] | null | undefined), expected);
      });
    }
  });
});
