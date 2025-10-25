/* eslint-disable @typescript-eslint/no-floating-promises */

import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';

import { ExportParser } from './export.parser.js';

describe('ExportParser', () => {
  let parser: ExportParser;

  beforeEach(() => {
    parser = new ExportParser();
  });

  describe('extractExports', () => {
    it('should capture named, default, and aliased exports', () => {
      const source = `
        export const alpha = 1;
        export function bravo() {}
        export { charlie as delta, echo };
        export default class Foxtrot {}
        export interface Golf {}
        export { type Hotel }
      `;

      const result = parser.extractExports(source);

      const expectedEntries = [
        { name: 'alpha', typeOnly: false },
        { name: 'bravo', typeOnly: false },
        { name: 'delta', typeOnly: false },
        { name: 'echo', typeOnly: false },
        { name: 'default', typeOnly: false },
        { name: 'Golf', typeOnly: true },
        { name: 'Hotel', typeOnly: true },
      ];

      for (const expected of expectedEntries) {
        assert.ok(
          result.some(
            (entry) => entry.name === expected.name && entry.typeOnly === expected.typeOnly,
          ),
        );
      }

      assert.strictEqual(result.length, expectedEntries.length);
    });

    it('should return an empty array when no exports exist', () => {
      const result = parser.extractExports('const unused = 1;');
      assert.deepStrictEqual(result, []);
    });

    const extractCases: Array<{ source: string; expected: { name: string; typeOnly: boolean } }> = [
      {
        source: 'export default function alpha() {}',
        expected: { name: 'default', typeOnly: false },
      },
      {
        source: 'export type { Bravo }',
        expected: { name: 'Bravo', typeOnly: true },
      },
      {
        source: 'export const charlie = 3;',
        expected: { name: 'charlie', typeOnly: false },
      },
    ];

    for (const [index, { source, expected }] of extractCases.entries()) {
      it(`should capture simple export pattern ${index}`, () => {
        const exports = parser.extractExports(source);
        assert.ok(
          exports.some(
            (entry) => entry.name === expected.name && entry.typeOnly === expected.typeOnly,
          ),
        );
      });
    }
  });
});
