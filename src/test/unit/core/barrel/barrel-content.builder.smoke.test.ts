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

import { BarrelContentBuilder } from '../../../../core/barrel/barrel-content.builder.js';
import { BarrelEntryKind, BarrelExportKind, type BarrelEntry } from '../../../../types/index.js';

describe('BarrelContentBuilder Test Suite', () => {
  let builder: BarrelContentBuilder;

  beforeEach(() => {
    builder = new BarrelContentBuilder();
  });

  it('should build content for single file with single export', async () => {
    const exportsByFile = new Map([['myFile.ts', ['MyClass']]]);
    const content = await builder.buildContent(exportsByFile, '/some/path');

    assert.strictEqual(content, "export { MyClass } from './myFile';\n");
  });

  it('should build content for single file with multiple exports', async () => {
    const exportsByFile = new Map([['myFile.ts', ['MyClass', 'MyInterface', 'myConst']]]);
    const content = await builder.buildContent(exportsByFile, '/some/path');

    // Exports are sorted alphabetically
    assert.strictEqual(content, "export { MyClass, myConst, MyInterface } from './myFile';\n");
  });

  it('should build content for multiple files', async () => {
    const exportsByFile = new Map([
      ['fileA.ts', ['ClassA']],
      ['fileB.ts', ['ClassB']],
    ]);
    const content = await builder.buildContent(exportsByFile, '/some/path');
    const lines = content.split('\n').filter(Boolean);

    assert.strictEqual(lines.length, 2);
    assert.ok(content.includes("export { ClassA } from './fileA';"));
    assert.ok(content.includes("export { ClassB } from './fileB';"));
  });

  it('should handle default exports', async () => {
    const exportsByFile = new Map([['myFile.ts', ['default']]]);
    const content = await builder.buildContent(exportsByFile, '/some/path');

    assert.strictEqual(content, "export { default } from './myFile';\n");
  });

  it('should handle default, type, and named exports together', async () => {
    const entries = new Map<string, BarrelEntry>();
    entries.set('myFile.ts', {
      kind: BarrelEntryKind.File,
      exports: [
        { kind: BarrelExportKind.Default },
        { kind: BarrelExportKind.Type, name: 'MyInterface' },
        { kind: BarrelExportKind.Value, name: 'MyClass' },
      ],
    });

    const content = await builder.buildContent(entries, '/some/path');

    // TypeScript 4.5+ mixed export syntax combines value and type in one statement
    assert.ok(
      content.includes("export { MyClass, type MyInterface } from './myFile';"),
      'Expected combined value and type export',
    );
    assert.ok(content.includes("export { default } from './myFile';"));
  });

  it('should sort files alphabetically', async () => {
    const exportsByFile = new Map([
      ['zebra.ts', ['ClassZ']],
      ['alpha.ts', ['ClassA']],
      ['beta.ts', ['ClassB']],
    ]);
    const content = await builder.buildContent(exportsByFile, '/some/path');
    const lines = content.split('\n').filter(Boolean);

    assert.ok(lines[0]?.includes('alpha'));
    assert.ok(lines[1]?.includes('beta'));
    assert.ok(lines[2]?.includes('zebra'));
  });

  it('should filter out parent folder references', async () => {
    const exportsByFile = new Map([
      ['../parent.ts', ['ParentClass']],
      ['local.ts', ['LocalClass']],
    ]);
    const content = await builder.buildContent(exportsByFile, '/some/path');

    assert.ok(!content.includes('ParentClass'));
    assert.ok(content.includes('LocalClass'));
  });
});
