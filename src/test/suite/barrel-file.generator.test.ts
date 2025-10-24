/* eslint-disable @typescript-eslint/no-floating-promises */

import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';

import * as vscode from 'vscode';

import { afterEach, beforeEach, describe, expect, it } from '../../test-utils/testHarness.js';

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

    expect(content).toContain('export { MyClass } from');
    expect(content).toContain('myConst');
    expect(content).toContain('export type { MyInterface }');
    expect(content).toContain('myFunction');
    expect(content).toContain("from './file1'");
    expect(content).toContain("from './file2'");
  });

  it('should update existing barrel file', async () => {
    await fs.writeFile(path.join(testDir, 'newFile.ts'), 'export class NewClass {}');
    await fs.writeFile(path.join(testDir, 'index.ts'), '// Old content');

    const generator = new BarrelFileGenerator();
    const uri = vscode.Uri.file(testDir);

    await generator.generateBarrelFile(uri);

    const barrelPath = path.join(testDir, 'index.ts');
    const content = await fs.readFile(barrelPath, 'utf-8');

    expect(content).toContain('NewClass');
    expect(content).not.toContain('// Old content');
  });

  it('should throw error when no TypeScript files found', async () => {
    const generator = new BarrelFileGenerator();
    const uri = vscode.Uri.file(testDir);

    await expect(generator.generateBarrelFile(uri)).rejects.toThrow(
      'No TypeScript files found in the selected directory',
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

    expect(content).toContain('export { MyClass } from');
    expect(content).not.toContain('IndexClass');
  });
});
