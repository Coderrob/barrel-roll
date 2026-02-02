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
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';

import * as vscode from 'vscode';

import { afterEach, beforeEach, describe, it } from 'node:test';

import { BarrelFileGenerator } from '../../core/barrel/barrel-file.generator.js';

describe('BarrelFileGenerator Test Suite', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'barrel-test-'));
  });

  afterEach(async () => {
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch {
      // Swallow cleanup errors to avoid masking test outcomes.
    }
  });

  /**
   * Helper function to generate a barrel file and read its content for testing.
   */
  async function generateAndReadBarrel(): Promise<string> {
    const generator = new BarrelFileGenerator();
    const uri = vscode.Uri.file(testDir);
    await generator.generateBarrelFile(uri);
    const barrelPath = path.join(testDir, 'index.ts');
    return fs.readFile(barrelPath, 'utf-8');
  }

  it('should generate barrel file with exports from multiple files', async () => {
    await fs.writeFile(
      path.join(testDir, 'file1.ts'),
      'export class MyClass {}\nexport const myConst = 42;',
    );
    await fs.writeFile(
      path.join(testDir, 'file2.ts'),
      'export interface MyInterface {}\nexport function myFunction() {}',
    );

    const content = await generateAndReadBarrel();

    assert.ok(content.includes('export { MyClass } from'));
    assert.ok(content.includes('myConst'));
    assert.ok(content.includes('export type { MyInterface }'));
    assert.ok(content.includes('myFunction'));
    assert.ok(content.includes("from './file1'"));
    assert.ok(content.includes("from './file2'"));
  });

  it('should update existing barrel file', async () => {
    await fs.writeFile(path.join(testDir, 'newFile.ts'), 'export class NewClass {}');
    await fs.writeFile(path.join(testDir, 'index.ts'), '// Old content');

    const content = await generateAndReadBarrel();

    assert.ok(content.includes('NewClass'));
    assert.ok(!content.includes('// Old content'));
  });

  it('should throw error when no TypeScript files found', async () => {
    const generator = new BarrelFileGenerator();
    const uri = vscode.Uri.file(testDir);

    await assert.rejects(
      generator.generateBarrelFile(uri),
      /No TypeScript files found in the selected directory/,
    );
  });

  it('should ignore index.ts when scanning files', async () => {
    await fs.writeFile(path.join(testDir, 'file1.ts'), 'export class MyClass {}');
    await fs.writeFile(path.join(testDir, 'index.ts'), 'export class IndexClass {}');

    const content = await generateAndReadBarrel();

    assert.ok(content.includes('export { MyClass } from'));
    assert.ok(!content.includes('IndexClass'));
  });
});
