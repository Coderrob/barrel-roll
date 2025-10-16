import * as assert from 'assert';
import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';

import * as vscode from 'vscode';

import { BarrelFileGenerator } from '../../core/services/barrel-file.generator';

suite('BarrelFileGenerator Test Suite', () => {
  let testDir: string;

  setup(async () => {
    // Create a temporary test directory
    testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'barrel-test-'));
  });

  teardown(async () => {
    // Clean up test directory
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  test('Should generate barrel file with exports from multiple files', async () => {
    // Create test TypeScript files
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

    // Read the generated barrel file
    const barrelPath = path.join(testDir, 'index.ts');
    const content = await fs.readFile(barrelPath, 'utf-8');

    // Verify the barrel file contains expected exports
    assert.ok(content.includes('MyClass'));
    assert.ok(content.includes('myConst'));
    assert.ok(content.includes('MyInterface'));
    assert.ok(content.includes('myFunction'));
    assert.ok(content.includes("from './file1'"));
    assert.ok(content.includes("from './file2'"));
  });

  test('Should update existing barrel file', async () => {
    // Create test TypeScript file
    await fs.writeFile(path.join(testDir, 'newFile.ts'), 'export class NewClass {}');

    // Create initial barrel file
    await fs.writeFile(path.join(testDir, 'index.ts'), '// Old content');

    const generator = new BarrelFileGenerator();
    const uri = vscode.Uri.file(testDir);

    await generator.generateBarrelFile(uri);

    // Read the updated barrel file
    const barrelPath = path.join(testDir, 'index.ts');
    const content = await fs.readFile(barrelPath, 'utf-8');

    // Verify the barrel file was updated
    assert.ok(content.includes('NewClass'));
    assert.ok(!content.includes('// Old content'));
  });

  test('Should throw error when no TypeScript files found', async () => {
    const generator = new BarrelFileGenerator();
    const uri = vscode.Uri.file(testDir);

    await assert.rejects(
      async () => {
        await generator.generateBarrelFile(uri);
      },
      {
        message: 'No TypeScript files found in the selected directory',
      },
    );
  });

  test('Should ignore index.ts when scanning files', async () => {
    // Create test TypeScript files including an index.ts
    await fs.writeFile(path.join(testDir, 'file1.ts'), 'export class MyClass {}');
    await fs.writeFile(path.join(testDir, 'index.ts'), 'export class IndexClass {}');

    const generator = new BarrelFileGenerator();
    const uri = vscode.Uri.file(testDir);

    await generator.generateBarrelFile(uri);

    // Read the generated barrel file
    const barrelPath = path.join(testDir, 'index.ts');
    const content = await fs.readFile(barrelPath, 'utf-8');

    // Verify the barrel file contains exports from file1 but not the old index.ts content
    assert.ok(content.includes('MyClass'));
    assert.ok(!content.includes('IndexClass'));
  });
});
