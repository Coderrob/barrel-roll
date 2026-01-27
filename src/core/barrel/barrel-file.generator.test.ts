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
        ["export { alpha } from './alpha.js';", "export * from './nested/index.js';", ''].join(
          '\n',
        ),
      );

      assert.strictEqual(
        nestedIndex,
        [
          "export type { Bravo } from './bravo.js';",
          "export { default } from './bravo.js';",
          "export * from './deeper/index.js';",
          '',
        ].join('\n'),
      );
      const expectedDeeperIndex = [
        "export { charlie } from './charlie.js';",
        "export { default } from './impl.js';",
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

    it('should only recurse into subdirectories that already contain barrels when updating', async () => {
      const generator = new BarrelFileGenerator();
      const rootUri = { fsPath: tmpDir } as unknown as Uri;

      const keepDir = path.join(tmpDir, 'keep');
      const skipDir = path.join(tmpDir, 'skip');

      await fileSystem.ensureDirectory(keepDir);
      await fileSystem.ensureDirectory(skipDir);

      await fileSystem.writeFile(path.join(keepDir, 'keep.ts'), 'export const keep = 1;');
      await fileSystem.writeFile(path.join(skipDir, 'skip.ts'), 'export const skip = 1;');

      await fileSystem.writeFile(path.join(keepDir, INDEX_FILENAME), "export * from '../legacy';");

      await generator.generateBarrelFile(rootUri, {
        recursive: true,
        mode: BarrelGenerationMode.UpdateExisting,
      });

      const keepIndex = await fileSystem.readFile(path.join(keepDir, INDEX_FILENAME));
      assert.strictEqual(keepIndex, ["export { keep } from './keep.js';", ''].join('\n'));

      const skipIndexExists = await fileSystem.fileExists(path.join(skipDir, INDEX_FILENAME));
      assert.strictEqual(skipIndexExists, false);

      const rootIndex = await fileSystem.readFile(path.join(tmpDir, INDEX_FILENAME));
      assert.strictEqual(rootIndex, ["export * from './keep/index.js';", ''].join('\n'));
    });

    it('should throw when no TypeScript files are present and recursion is disabled', async () => {
      const generator = new BarrelFileGenerator();
      const emptyDirUri = { fsPath: tmpDir } as unknown as Uri;

      await assert.rejects(
        generator.generateBarrelFile(emptyDirUri),
        /No TypeScript files found in the selected directory/,
      );
    });

    it('should not create barrel when no TypeScript files and recursion is enabled', async () => {
      const generator = new BarrelFileGenerator();
      const emptyDirUri = { fsPath: tmpDir } as unknown as Uri;

      await generator.generateBarrelFile(emptyDirUri, { recursive: true });

      const exists = await fileSystem.fileExists(path.join(tmpDir, INDEX_FILENAME));
      assert.strictEqual(exists, false);
    });

    it('should sanitize existing barrel when recursive and no TypeScript files', async () => {
      const generator = new BarrelFileGenerator();
      const emptyDirUri = { fsPath: tmpDir } as unknown as Uri;

      await fileSystem.writeFile(path.join(tmpDir, INDEX_FILENAME), "export * from '../outside';");

      await generator.generateBarrelFile(emptyDirUri, { recursive: true });

      const rootIndex = await fileSystem.readFile(path.join(tmpDir, INDEX_FILENAME));

      assert.strictEqual(rootIndex, '\n');
    });
  });
});
