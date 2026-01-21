/* eslint-disable @typescript-eslint/no-floating-promises */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { isEmptyArray } from './array';

function formatValue(value: unknown): string {
  return Array.isArray(value) ? `[${value.map(String).join(', ')}]` : String(value);
}

describe('array utils', () => {
  void describe('isEmptyArray', () => {
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

      void it(description, () => {
        assert.strictEqual(isEmptyArray(input as readonly unknown[] | null | undefined), expected);
      });
    }
  });
});
