/* eslint-disable @typescript-eslint/no-floating-promises */

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

  it('should generate barrel file with exports from multiple files', async () => {
    await fs.writeFile(
      path.join(testDir, 'file1.ts'),
      'export class MyClass {}\nexport const myConst = 42;',
    );
    await fs.writeFile(
      path.join(testDir, 'file2.ts'),
      'export interface MyInterface {}\nexport function myFunction() {}',
    );

    const generator = new BarrelFileGenerator();
    const uri = vscode.Uri.file(testDir);

    await generator.generateBarrelFile(uri);

    const barrelPath = path.join(testDir, 'index.ts');
    const content = await fs.readFile(barrelPath, 'utf-8');

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

    const generator = new BarrelFileGenerator();
    const uri = vscode.Uri.file(testDir);

    await generator.generateBarrelFile(uri);

    const barrelPath = path.join(testDir, 'index.ts');
    const content = await fs.readFile(barrelPath, 'utf-8');

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

    const generator = new BarrelFileGenerator();
    const uri = vscode.Uri.file(testDir);

    await generator.generateBarrelFile(uri);

    const barrelPath = path.join(testDir, 'index.ts');
    const content = await fs.readFile(barrelPath, 'utf-8');

    assert.ok(content.includes('export { MyClass } from'));
    assert.ok(!content.includes('IndexClass'));
  });
});
