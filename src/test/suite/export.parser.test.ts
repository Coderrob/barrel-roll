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

import { ExportParser } from '../../core/parser/export.parser.js';

describe('ExportParser Test Suite', () => {
  let parser: ExportParser;

  beforeEach(() => {
    parser = new ExportParser();
  });

  it('should extract class exports', () => {
    const content = 'export class MyClass {}';
    const exports = parser.extractExports(content);

    assert.deepStrictEqual(exports, [{ name: 'MyClass', typeOnly: false }]);
  });

  it('should extract interface exports', () => {
    const content = 'export interface MyInterface {}';
    const exports = parser.extractExports(content);

    assert.deepStrictEqual(exports, [{ name: 'MyInterface', typeOnly: true }]);
  });

  it('should extract type exports', () => {
    const content = 'export type MyType = string;';
    const exports = parser.extractExports(content);

    assert.deepStrictEqual(exports, [{ name: 'MyType', typeOnly: true }]);
  });

  it('should extract function exports', () => {
    const content = 'export function myFunction() {}';
    const exports = parser.extractExports(content);

    assert.deepStrictEqual(exports, [{ name: 'myFunction', typeOnly: false }]);
  });

  it('should extract const exports', () => {
    const content = 'export const myConst = 42;';
    const exports = parser.extractExports(content);

    assert.deepStrictEqual(exports, [{ name: 'myConst', typeOnly: false }]);
  });

  it('should extract enum exports', () => {
    const content = 'export enum MyEnum { A, B }';
    const exports = parser.extractExports(content);

    assert.deepStrictEqual(exports, [{ name: 'MyEnum', typeOnly: false }]);
  });

  it('should extract default exports', () => {
    const content = 'export default class MyClass {}';
    const exports = parser.extractExports(content);

    assert.ok(exports.some((entry) => entry.name === 'default' && entry.typeOnly === false));
  });

  it('should extract multiple exports', () => {
    const content = `
      export class MyClass {}
      export interface MyInterface {}
      export const myConst = 42;
    `;
    const exports = parser.extractExports(content);

    assert.strictEqual(exports.length, 3);
    const requiredEntries = [
      { name: 'MyClass', typeOnly: false },
      { name: 'MyInterface', typeOnly: true },
      { name: 'myConst', typeOnly: false },
    ];
    for (const expectedEntry of requiredEntries) {
      assert.ok(
        exports.some(
          (entry) => entry.name === expectedEntry.name && entry.typeOnly === expectedEntry.typeOnly,
        ),
      );
    }
  });

  it('should extract export lists', () => {
    const content = 'export { MyClass, MyInterface };';
    const exports = parser.extractExports(content);

    const listEntries = [
      { name: 'MyClass', typeOnly: false },
      { name: 'MyInterface', typeOnly: false },
    ];
    for (const expectedEntry of listEntries) {
      assert.ok(
        exports.some(
          (entry) => entry.name === expectedEntry.name && entry.typeOnly === expectedEntry.typeOnly,
        ),
      );
    }
  });

  it('should handle export with as keyword', () => {
    const content = 'export { MyClass as RenamedClass };';
    const exports = parser.extractExports(content);

    assert.ok(exports.some((entry) => entry.name === 'RenamedClass' && entry.typeOnly === false));
  });

  it('should ignore comments', () => {
    const content = `
      // export class CommentedClass {}
      /* export const commentedConst = 42; */
      export class RealClass {}
    `;
    const exports = parser.extractExports(content);

    assert.deepStrictEqual(exports, [{ name: 'RealClass', typeOnly: false }]);
  });

  it('should remove duplicates', () => {
    const content = `
      export const myConst = 42;
      export { myConst };
    `;
    const exports = parser.extractExports(content);

    assert.strictEqual(exports.length, 1);
    assert.deepStrictEqual(exports, [{ name: 'myConst', typeOnly: false }]);
  });
});
