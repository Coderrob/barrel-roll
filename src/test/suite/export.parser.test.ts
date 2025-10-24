/* eslint-disable @typescript-eslint/no-floating-promises */

import { beforeEach, describe, expect, it } from '../../test-utils/testHarness.js';

import { ExportParser } from '../../core/parser/export.parser.js';

describe('ExportParser Test Suite', () => {
  let parser: ExportParser;

  beforeEach(() => {
    parser = new ExportParser();
  });

  it('should extract class exports', () => {
    const content = 'export class MyClass {}';
    const exports = parser.extractExports(content);

    expect(exports).toEqual([{ name: 'MyClass', typeOnly: false }]);
  });

  it('should extract interface exports', () => {
    const content = 'export interface MyInterface {}';
    const exports = parser.extractExports(content);

    expect(exports).toEqual([{ name: 'MyInterface', typeOnly: true }]);
  });

  it('should extract type exports', () => {
    const content = 'export type MyType = string;';
    const exports = parser.extractExports(content);

    expect(exports).toEqual([{ name: 'MyType', typeOnly: true }]);
  });

  it('should extract function exports', () => {
    const content = 'export function myFunction() {}';
    const exports = parser.extractExports(content);

    expect(exports).toEqual([{ name: 'myFunction', typeOnly: false }]);
  });

  it('should extract const exports', () => {
    const content = 'export const myConst = 42;';
    const exports = parser.extractExports(content);

    expect(exports).toEqual([{ name: 'myConst', typeOnly: false }]);
  });

  it('should extract enum exports', () => {
    const content = 'export enum MyEnum { A, B }';
    const exports = parser.extractExports(content);

    expect(exports).toEqual([{ name: 'MyEnum', typeOnly: false }]);
  });

  it('should extract default exports', () => {
    const content = 'export default class MyClass {}';
    const exports = parser.extractExports(content);

    expect(exports).toEqual(expect.arrayContaining([{ name: 'default', typeOnly: false }]));
  });

  it('should extract multiple exports', () => {
    const content = `
      export class MyClass {}
      export interface MyInterface {}
      export const myConst = 42;
    `;
    const exports = parser.extractExports(content);

    expect(exports).toHaveLength(3);
    expect(exports).toEqual(
      expect.arrayContaining([
        { name: 'MyClass', typeOnly: false },
        { name: 'MyInterface', typeOnly: true },
        { name: 'myConst', typeOnly: false },
      ]),
    );
  });

  it('should extract export lists', () => {
    const content = 'export { MyClass, MyInterface };';
    const exports = parser.extractExports(content);

    expect(exports).toEqual(
      expect.arrayContaining([
        { name: 'MyClass', typeOnly: false },
        { name: 'MyInterface', typeOnly: false },
      ]),
    );
  });

  it('should handle export with as keyword', () => {
    const content = 'export { MyClass as RenamedClass };';
    const exports = parser.extractExports(content);

    expect(exports).toEqual(expect.arrayContaining([{ name: 'RenamedClass', typeOnly: false }]));
  });

  it('should ignore comments', () => {
    const content = `
      // export class CommentedClass {}
      /* export const commentedConst = 42; */
      export class RealClass {}
    `;
    const exports = parser.extractExports(content);

    expect(exports).toEqual([{ name: 'RealClass', typeOnly: false }]);
  });

  it('should remove duplicates', () => {
    const content = `
      export const myConst = 42;
      export { myConst };
    `;
    const exports = parser.extractExports(content);

    expect(exports).toHaveLength(1);
    expect(exports).toEqual([{ name: 'myConst', typeOnly: false }]);
  });
});
