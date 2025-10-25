/* eslint-disable @typescript-eslint/no-floating-promises */

import assert from 'node:assert/strict';
import * as os from 'node:os';
import * as path from 'node:path';

import type { Uri } from 'vscode';

import { afterEach, beforeEach, describe, it } from 'node:test';

import { BarrelGenerationMode, INDEX_FILENAME } from '../../types/index.js';
import { FileSystemService } from '../io/file-system.service.js';
import { BarrelFileGenerator } from './barrel-file.generator.js';

describe('BarrelFileGenerator', () => {
  let tmpDir: string;
  let fileSystem: FileSystemService;

  beforeEach(async () => {
    fileSystem = new FileSystemService();
    tmpDir = await fileSystem.createTempDirectory(path.join(os.tmpdir(), 'barrel-roll-'));
  });

  afterEach(async () => {
    await fileSystem.removePath(tmpDir);
  });

  describe('generateBarrelFile', () => {
    it('should generate recursive barrel files for nested directories', async () => {
      const nestedDir = path.join(tmpDir, 'nested');
      const deeperDir = path.join(nestedDir, 'deeper');

      await fileSystem.ensureDirectory(deeperDir);

      await fileSystem.writeFile(path.join(tmpDir, 'alpha.ts'), 'export const alpha = 1;');
      await fileSystem.writeFile(
        path.join(nestedDir, 'bravo.ts'),
        `
        export interface Bravo {}
        export default function bravo() {}
      `,
      );
      await fileSystem.writeFile(
        path.join(deeperDir, 'charlie.ts'),
        `
        export { default as charlie } from './impl';
      `,
      );
      await fileSystem.writeFile(
        path.join(deeperDir, 'impl.ts'),
        'export default function impl() {}',
      );

      const generator = new BarrelFileGenerator();
      const rootUri = { fsPath: tmpDir } as unknown as Uri;
      await generator.generateBarrelFile(rootUri, { recursive: true });

      const rootIndex = await fileSystem.readFile(path.join(tmpDir, INDEX_FILENAME));
      const nestedIndex = await fileSystem.readFile(path.join(nestedDir, INDEX_FILENAME));
      const deeperIndex = await fileSystem.readFile(path.join(deeperDir, INDEX_FILENAME));

      assert.strictEqual(
        rootIndex,
        ["export { alpha } from './alpha';", "export * from './nested';", ''].join('\n'),
      );

      assert.strictEqual(
        nestedIndex,
        [
          "export type { Bravo } from './bravo';",
          "export { default } from './bravo';",
          "export * from './deeper';",
          '',
        ].join('\n'),
      );
      const expectedDeeperIndex = [
        "export { charlie } from './charlie';",
        "export { default } from './impl';",
        '',
      ].join('\n');

      assert.strictEqual(deeperIndex, expectedDeeperIndex);
    });

    it('should sanitize existing barrels when updating', async () => {
      const generator = new BarrelFileGenerator();
      const rootUri = { fsPath: tmpDir } as unknown as Uri;

      await fileSystem.writeFile(path.join(tmpDir, INDEX_FILENAME), "export * from '../outside';");

      await generator.generateBarrelFile(rootUri, {
        mode: BarrelGenerationMode.UpdateExisting,
      });

      const rootIndex = await fileSystem.readFile(path.join(tmpDir, INDEX_FILENAME));

      assert.strictEqual(rootIndex, '\n');
    });

    it('should skip creating barrels when updating non-existent ones', async () => {
      const generator = new BarrelFileGenerator();
      const nestedDir = path.join(tmpDir, 'missing');
      await fileSystem.ensureDirectory(nestedDir);

      const nestedUri = { fsPath: nestedDir } as unknown as Uri;
      await generator.generateBarrelFile(nestedUri, {
        mode: BarrelGenerationMode.UpdateExisting,
      });

      const exists = await fileSystem.fileExists(path.join(nestedDir, INDEX_FILENAME));

      assert.strictEqual(exists, false);
    });

    it('should throw when no TypeScript files are present and recursion is disabled', async () => {
      const generator = new BarrelFileGenerator();
      const emptyDirUri = { fsPath: tmpDir } as unknown as Uri;

      await assert.rejects(
        generator.generateBarrelFile(emptyDirUri),
        /No TypeScript files found in the selected directory/,
      );
    });
  });
});
