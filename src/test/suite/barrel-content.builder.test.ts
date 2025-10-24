/* eslint-disable @typescript-eslint/no-floating-promises */

import { beforeEach, describe, expect, it } from '../../test-utils/testHarness.js';

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

    expect(content).toBe("export { MyClass } from './myFile';\n");
  });

  it('should build content for single file with multiple exports', () => {
    const exportsByFile = new Map([['myFile.ts', ['MyClass', 'MyInterface', 'myConst']]]);
    const content = builder.buildContent(exportsByFile, '/some/path');

    expect(content).toBe("export { MyClass, MyInterface, myConst } from './myFile';\n");
  });

  it('should build content for multiple files', () => {
    const exportsByFile = new Map([
      ['fileA.ts', ['ClassA']],
      ['fileB.ts', ['ClassB']],
    ]);
    const content = builder.buildContent(exportsByFile, '/some/path');
    const lines = content.split('\n').filter(Boolean);

    expect(lines).toHaveLength(2);
    expect(content).toContain("export { ClassA } from './fileA';");
    expect(content).toContain("export { ClassB } from './fileB';");
  });

  it('should handle default exports', () => {
    const exportsByFile = new Map([['myFile.ts', ['default']]]);
    const content = builder.buildContent(exportsByFile, '/some/path');

    expect(content).toBe("export { default } from './myFile';\n");
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

    expect(content).toContain("export { MyClass } from './myFile';");
    expect(content).toContain("export type { MyInterface } from './myFile';");
    expect(content).toContain("export { default } from './myFile';");
  });

  it('should sort files alphabetically', () => {
    const exportsByFile = new Map([
      ['zebra.ts', ['ClassZ']],
      ['alpha.ts', ['ClassA']],
      ['beta.ts', ['ClassB']],
    ]);
    const content = builder.buildContent(exportsByFile, '/some/path');
    const lines = content.split('\n').filter(Boolean);

    expect(lines[0]).toContain('alpha');
    expect(lines[1]).toContain('beta');
    expect(lines[2]).toContain('zebra');
  });

  it('should filter out parent folder references', () => {
    const exportsByFile = new Map([
      ['../parent.ts', ['ParentClass']],
      ['local.ts', ['LocalClass']],
    ]);
    const content = builder.buildContent(exportsByFile, '/some/path');

    expect(content).not.toContain('ParentClass');
    expect(content).toContain('LocalClass');
  });
});
