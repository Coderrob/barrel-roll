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

    it('should merge duplicate exports and prefer value exports over type-only', () => {
      const source = `
        export type { Hotel };
        export { Hotel };
      `;

      const exports = parser.extractExports(source);
      const hotel = exports.find((entry) => entry.name === 'Hotel');

      assert.ok(hotel);
      assert.strictEqual(hotel.typeOnly, false);
    });

    it('should ignore export statements inside single-quoted strings', () => {
      const source = `
        const example = 'export class FakeClass {}';
        const another = 'export interface FakeInterface {}';
      `;

      const exports = parser.extractExports(source);
      assert.deepStrictEqual(exports, []);
    });

    it('should ignore export statements inside double-quoted strings', () => {
      const source = `
        const example = "export class FakeClass {}";
        const another = "export const fakeConst = 1;";
      `;

      const exports = parser.extractExports(source);
      assert.deepStrictEqual(exports, []);
    });

    it('should ignore export statements inside template literals', () => {
      const source = `
        const example = \`export class FakeClass {}\`;
        const multiline = \`
          export interface FakeInterface {}
          export function fakeFunction() {}
        \`;
      `;

      const exports = parser.extractExports(source);
      assert.deepStrictEqual(exports, []);
    });

    it('should ignore export statements inside strings with escaped quotes', () => {
      const source = String.raw`
        const example = 'export class \'FakeClass\' {}';
        const another = "export const \"fakeConst\" = 1;";
      `;

      const exports = parser.extractExports(source);
      assert.deepStrictEqual(exports, []);
    });

    it('should parse real exports while ignoring exports in strings', () => {
      const source = `
        export class RealClass {}
        const testContent = 'export class FakeClass {}';
        export function realFunction() {}
      `;

      const exports = parser.extractExports(source);

      assert.strictEqual(exports.length, 2);
      assert.ok(exports.some((e) => e.name === 'RealClass' && !e.typeOnly));
      assert.ok(exports.some((e) => e.name === 'realFunction' && !e.typeOnly));
      assert.ok(!exports.some((e) => e.name === 'FakeClass'));
    });
  });
});
