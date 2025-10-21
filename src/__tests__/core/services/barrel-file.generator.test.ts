import * as os from 'os';
import * as path from 'path';

import type { Uri } from 'vscode';

import { BarrelFileGenerator } from '../../../core/services/barrel-file.generator';
import { FileSystemService } from '../../../core/services/file-system.service';

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

      const rootIndex = await fileSystem.readFile(path.join(tmpDir, 'index.ts'));
      const nestedIndex = await fileSystem.readFile(path.join(nestedDir, 'index.ts'));
      const deeperIndex = await fileSystem.readFile(path.join(deeperDir, 'index.ts'));

      expect(rootIndex).toBe(
        ["export { alpha } from './alpha';", "export * from './nested';", ''].join('\n'),
      );

      expect(nestedIndex).toBe(
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

      expect(deeperIndex).toBe(expectedDeeperIndex);
    });

    it('should sanitize existing barrels when updating', async () => {
      const generator = new BarrelFileGenerator();
      const rootUri = { fsPath: tmpDir } as unknown as Uri;

      await fileSystem.writeFile(path.join(tmpDir, 'index.ts'), "export * from '../outside';");

      await generator.generateBarrelFile(rootUri, { mode: 'updateExisting' });

      const rootIndex = await fileSystem.readFile(path.join(tmpDir, 'index.ts'));

      expect(rootIndex).toBe('\n');
    });

    it('should skip creating barrels when updating non-existent ones', async () => {
      const generator = new BarrelFileGenerator();
      const nestedDir = path.join(tmpDir, 'missing');
      await fileSystem.ensureDirectory(nestedDir);

      const nestedUri = { fsPath: nestedDir } as unknown as Uri;
      await generator.generateBarrelFile(nestedUri, { mode: 'updateExisting' });

      const exists = await fileSystem.fileExists(path.join(nestedDir, 'index.ts'));

      expect(exists).toBe(false);
    });

    it('should throw when no TypeScript files are present and recursion is disabled', async () => {
      const generator = new BarrelFileGenerator();
      const emptyDirUri = { fsPath: tmpDir } as unknown as Uri;

      await expect(generator.generateBarrelFile(emptyDirUri)).rejects.toThrow(
        'No TypeScript files found in the selected directory',
      );
    });
  });
});
