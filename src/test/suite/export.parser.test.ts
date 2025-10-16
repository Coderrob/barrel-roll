import * as assert from 'assert';

import { ExportParser } from '../../core/services/export.parser';

suite('ExportParser Test Suite', () => {
  let parser: ExportParser;

  setup(() => {
    parser = new ExportParser();
  });

  test('Should extract class exports', () => {
    const content = 'export class MyClass {}';
    const exports = parser.extractExports(content);
    assert.deepStrictEqual(exports, ['MyClass']);
  });

  test('Should extract interface exports', () => {
    const content = 'export interface MyInterface {}';
    const exports = parser.extractExports(content);
    assert.deepStrictEqual(exports, ['MyInterface']);
  });

  test('Should extract type exports', () => {
    const content = 'export type MyType = string;';
    const exports = parser.extractExports(content);
    assert.deepStrictEqual(exports, ['MyType']);
  });

  test('Should extract function exports', () => {
    const content = 'export function myFunction() {}';
    const exports = parser.extractExports(content);
    assert.deepStrictEqual(exports, ['myFunction']);
  });

  test('Should extract const exports', () => {
    const content = 'export const myConst = 42;';
    const exports = parser.extractExports(content);
    assert.deepStrictEqual(exports, ['myConst']);
  });

  test('Should extract enum exports', () => {
    const content = 'export enum MyEnum { A, B }';
    const exports = parser.extractExports(content);
    assert.deepStrictEqual(exports, ['MyEnum']);
  });

  test('Should extract default exports', () => {
    const content = 'export default class MyClass {}';
    const exports = parser.extractExports(content);
    assert.ok(exports.includes('default'));
  });

  test('Should extract multiple exports', () => {
    const content = `
      export class MyClass {}
      export interface MyInterface {}
      export const myConst = 42;
    `;
    const exports = parser.extractExports(content);
    assert.strictEqual(exports.length, 3);
    assert.ok(exports.includes('MyClass'));
    assert.ok(exports.includes('MyInterface'));
    assert.ok(exports.includes('myConst'));
  });

  test('Should extract export lists', () => {
    const content = 'export { MyClass, MyInterface };';
    const exports = parser.extractExports(content);
    assert.ok(exports.includes('MyClass'));
    assert.ok(exports.includes('MyInterface'));
  });

  test('Should handle export with as keyword', () => {
    const content = 'export { MyClass as RenamedClass };';
    const exports = parser.extractExports(content);
    assert.ok(exports.includes('MyClass'));
  });

  test('Should ignore comments', () => {
    const content = `
      // export class CommentedClass {}
      /* export const commentedConst = 42; */
      export class RealClass {}
    `;
    const exports = parser.extractExports(content);
    assert.deepStrictEqual(exports, ['RealClass']);
  });

  test('Should remove duplicates', () => {
    const content = `
      export const myConst = 42;
      export { myConst };
    `;
    const exports = parser.extractExports(content);
    assert.strictEqual(exports.length, 1);
    assert.deepStrictEqual(exports, ['myConst']);
  });
});
