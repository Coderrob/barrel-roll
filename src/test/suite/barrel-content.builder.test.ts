/* eslint-disable @typescript-eslint/no-floating-promises */

import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';

import { BarrelContentBuilder } from '../../core/barrel/barrel-content.builder.js';
import { BarrelEntryKind, BarrelExportKind, type BarrelEntry } from '../../types/index.js';

describe('BarrelContentBuilder Test Suite', () => {
  let builder: BarrelContentBuilder;

  beforeEach(() => {
    builder = new BarrelContentBuilder();
  });

  it('should build content for single file with single export', () => {
    const exportsByFile = new Map([['myFile.ts', ['MyClass']]]);
    const content = builder.buildContent(exportsByFile, '/some/path');

    assert.strictEqual(content, "export { MyClass } from './myFile';\n");
  });

  it('should build content for single file with multiple exports', () => {
    const exportsByFile = new Map([['myFile.ts', ['MyClass', 'MyInterface', 'myConst']]]);
    const content = builder.buildContent(exportsByFile, '/some/path');

    assert.strictEqual(content, "export { MyClass, MyInterface, myConst } from './myFile';\n");
  });

  it('should build content for multiple files', () => {
    const exportsByFile = new Map([
      ['fileA.ts', ['ClassA']],
      ['fileB.ts', ['ClassB']],
    ]);
    const content = builder.buildContent(exportsByFile, '/some/path');
    const lines = content.split('\n').filter(Boolean);

    assert.strictEqual(lines.length, 2);
    assert.ok(content.includes("export { ClassA } from './fileA';"));
    assert.ok(content.includes("export { ClassB } from './fileB';"));
  });

  it('should handle default exports', () => {
    const exportsByFile = new Map([['myFile.ts', ['default']]]);
    const content = builder.buildContent(exportsByFile, '/some/path');

    assert.strictEqual(content, "export { default } from './myFile';\n");
  });

  it('should handle default, type, and named exports together', () => {
    const entries = new Map<string, BarrelEntry>();
    entries.set('myFile.ts', {
      kind: BarrelEntryKind.File,
      exports: [
        { kind: BarrelExportKind.Default },
        { kind: BarrelExportKind.Type, name: 'MyInterface' },
        { kind: BarrelExportKind.Value, name: 'MyClass' },
      ],
    });

    const content = builder.buildContent(entries, '/some/path');

    assert.ok(content.includes("export { MyClass } from './myFile';"));
    assert.ok(content.includes("export type { MyInterface } from './myFile';"));
    assert.ok(content.includes("export { default } from './myFile';"));
  });

  it('should sort files alphabetically', () => {
    const exportsByFile = new Map([
      ['zebra.ts', ['ClassZ']],
      ['alpha.ts', ['ClassA']],
      ['beta.ts', ['ClassB']],
    ]);
    const content = builder.buildContent(exportsByFile, '/some/path');
    const lines = content.split('\n').filter(Boolean);

    assert.ok(lines[0]?.includes('alpha'));
    assert.ok(lines[1]?.includes('beta'));
    assert.ok(lines[2]?.includes('zebra'));
  });

  it('should filter out parent folder references', () => {
    const exportsByFile = new Map([
      ['../parent.ts', ['ParentClass']],
      ['local.ts', ['LocalClass']],
    ]);
    const content = builder.buildContent(exportsByFile, '/some/path');

    assert.ok(!content.includes('ParentClass'));
    assert.ok(content.includes('LocalClass'));
  });
});
