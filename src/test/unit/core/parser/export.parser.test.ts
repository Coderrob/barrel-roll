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
import { beforeEach, describe, it } from 'node:test';

import { ExportParser } from '../../../../core/parser/export.parser.js';

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

    // Test cases for specific AST node types to ensure private methods are covered
    it('should extract class exports', () => {
      const source = 'export class MyClass {}';
      const exports = parser.extractExports(source);
      assert.deepStrictEqual(exports, [{ name: 'MyClass', typeOnly: false }]);
    });

    it('should extract interface exports', () => {
      const source = 'export interface MyInterface {}';
      const exports = parser.extractExports(source);
      assert.deepStrictEqual(exports, [{ name: 'MyInterface', typeOnly: true }]);
    });

    it('should extract type alias exports', () => {
      const source = 'export type MyType = string;';
      const exports = parser.extractExports(source);
      assert.deepStrictEqual(exports, [{ name: 'MyType', typeOnly: true }]);
    });

    it('should extract enum exports', () => {
      const source = 'export enum MyEnum { A, B, C }';
      const exports = parser.extractExports(source);
      assert.deepStrictEqual(exports, [{ name: 'MyEnum', typeOnly: false }]);
    });

    it('should extract variable exports', () => {
      const source = 'export const myVar = 42;';
      const exports = parser.extractExports(source);
      assert.deepStrictEqual(exports, [{ name: 'myVar', typeOnly: false }]);
    });

    it('should extract function exports', () => {
      const source = 'export function myFunction() {}';
      const exports = parser.extractExports(source);
      assert.deepStrictEqual(exports, [{ name: 'myFunction', typeOnly: false }]);
    });

    it('should handle anonymous default class exports', () => {
      const source = 'export default class {}';
      const exports = parser.extractExports(source);
      assert.deepStrictEqual(exports, [{ name: 'default', typeOnly: false }]);
    });

    it('should handle named default class exports', () => {
      const source = 'export default class MyClass {}';
      const exports = parser.extractExports(source);
      assert.deepStrictEqual(exports, [{ name: 'default', typeOnly: false }]);
    });

    it('should handle multiple variable declarations', () => {
      const source = 'export const a = 1, b = 2, c = 3;';
      const exports = parser.extractExports(source);
      assert.deepStrictEqual(exports, [
        { name: 'a', typeOnly: false },
        { name: 'b', typeOnly: false },
        { name: 'c', typeOnly: false },
      ]);
    });

    it('should handle re-exports with aliases', () => {
      const source = "export { default as MyClass } from './other-module';";
      const exports = parser.extractExports(source);
      assert.deepStrictEqual(exports, [{ name: 'MyClass', typeOnly: false }]);
    });

    it('should skip unaliased re-exports', () => {
      const source = "export { SomeClass } from './other-module';";
      const exports = parser.extractExports(source);
      assert.deepStrictEqual(exports, []);
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

    it('should ignore exports in assertion strings (real-world test pattern)', () => {
      const source = String.raw`
        import assert from 'node:assert';
        import { describe, it } from 'node:test';

        describe('MyParser', () => {
          it('should extract class exports', () => {
            const content = 'export class MyClass {}';
            const exports = parser.extractExports(content);
            assert.deepStrictEqual(exports, [{ name: 'MyClass', typeOnly: false }]);
          });

          it('should handle multiple exports', () => {
            assert.strictEqual(content, "export { MyClass, MyInterface } from './myFile';\n");
          });
        });
      `;

      const exports = parser.extractExports(source);
      assert.deepStrictEqual(exports, []);
    });

    it('should ignore exports inside comments', () => {
      const source = `
        // export class CommentedClass {}
        /* export interface CommentedInterface {} */
        /**
         * Example: export const documentedConst = 1;
         */
      `;

      const exports = parser.extractExports(source);
      assert.deepStrictEqual(exports, []);
    });

    it('should handle mixed comments, strings, and real exports', () => {
      const source = `
        // export class CommentedOut {}
        export class RealClass {}
        const str = "export interface FakeInterface {}";
        /* export function commentedFunction() {} */
        export const realConst = 42;
        const template = \`export enum FakeEnum { A }\`;
      `;

      const exports = parser.extractExports(source);

      assert.strictEqual(exports.length, 2);
      assert.ok(exports.some((e) => e.name === 'RealClass' && !e.typeOnly));
      assert.ok(exports.some((e) => e.name === 'realConst' && !e.typeOnly));
      assert.ok(!exports.some((e) => e.name === 'CommentedOut'));
      assert.ok(!exports.some((e) => e.name === 'FakeInterface'));
      assert.ok(!exports.some((e) => e.name === 'commentedFunction'));
      assert.ok(!exports.some((e) => e.name === 'FakeEnum'));
    });

    it('should handle nested template literals with expressions', () => {
      const source = `
        const nested = \`prefix \${'export class Nested {}'} suffix\`;
        const complex = \`
          multiline with \${someVar} and 'export function inner() {}'
        \`;
      `;

      const exports = parser.extractExports(source);
      assert.deepStrictEqual(exports, []);
    });

    it('should handle export-like content in Map/object literals', () => {
      const source = `
        const exportsByFile = new Map([['myFile.ts', ['MyClass', 'MyInterface', 'myConst']]]);
        const config = { pattern: "export { ClassA } from './fileA';" };
      `;

      const exports = parser.extractExports(source);
      assert.deepStrictEqual(exports, []);
    });

    it('should ignore exports inside regex literals', () => {
      const source = String.raw`
        const pattern = /export class FakeClass {}/;
        const globalPattern = /export const fakeConst = \d+/gi;
        const test = /export\s+function\s+fake/.test(input);
      `;

      const exports = parser.extractExports(source);
      assert.deepStrictEqual(exports, []);
    });
  });
});
