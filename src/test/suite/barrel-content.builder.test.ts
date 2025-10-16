import * as assert from 'assert';

import { BarrelContentBuilder } from '../../core/services/barrel-content.builder';

suite('BarrelContentBuilder Test Suite', () => {
  let builder: BarrelContentBuilder;

  setup(() => {
    builder = new BarrelContentBuilder();
  });

  test('Should build content for single file with single export', () => {
    const exportsByFile = new Map([['myFile.ts', ['MyClass']]]);
    const content = builder.buildContent(exportsByFile, '/some/path');
    assert.strictEqual(content, "export { MyClass } from './myFile';\n");
  });

  test('Should build content for single file with multiple exports', () => {
    const exportsByFile = new Map([['myFile.ts', ['MyClass', 'MyInterface', 'myConst']]]);
    const content = builder.buildContent(exportsByFile, '/some/path');
    assert.strictEqual(content, "export { MyClass, MyInterface, myConst } from './myFile';\n");
  });

  test('Should build content for multiple files', () => {
    const exportsByFile = new Map([
      ['fileA.ts', ['ClassA']],
      ['fileB.ts', ['ClassB']],
    ]);
    const content = builder.buildContent(exportsByFile, '/some/path');
    const lines = content.split('\n').filter((line) => line);
    assert.strictEqual(lines.length, 2);
    assert.ok(content.includes("export { ClassA } from './fileA';"));
    assert.ok(content.includes("export { ClassB } from './fileB';"));
  });

  test('Should handle default exports', () => {
    const exportsByFile = new Map([['myFile.ts', ['default']]]);
    const content = builder.buildContent(exportsByFile, '/some/path');
    assert.strictEqual(content, "export { default } from './myFile';\n");
  });

  test('Should handle default and named exports together', () => {
    const exportsByFile = new Map([['myFile.ts', ['default', 'MyClass']]]);
    const content = builder.buildContent(exportsByFile, '/some/path');
    assert.ok(content.includes("export { MyClass } from './myFile';"));
    assert.ok(content.includes("export { default } from './myFile';"));
  });

  test('Should sort files alphabetically', () => {
    const exportsByFile = new Map([
      ['zebra.ts', ['ClassZ']],
      ['alpha.ts', ['ClassA']],
      ['beta.ts', ['ClassB']],
    ]);
    const content = builder.buildContent(exportsByFile, '/some/path');
    const lines = content.split('\n').filter((line) => line);
    assert.ok(lines[0].includes('alpha'));
    assert.ok(lines[1].includes('beta'));
    assert.ok(lines[2].includes('zebra'));
  });

  test('Should filter out parent folder references', () => {
    const exportsByFile = new Map([
      ['../parent.ts', ['ParentClass']],
      ['local.ts', ['LocalClass']],
    ]);
    const content = builder.buildContent(exportsByFile, '/some/path');
    assert.ok(!content.includes('ParentClass'));
    assert.ok(content.includes('LocalClass'));
  });
});
