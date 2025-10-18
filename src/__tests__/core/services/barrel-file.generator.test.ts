import { promises as fs } from 'fs';
import * as os from 'os';
import * as path from 'path';

import type { Uri } from 'vscode';

import { BarrelFileGenerator } from '../../../core/services/barrel-file.generator';

describe('BarrelFileGenerator', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'barrel-roll-'));
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('generates recursive barrel files for nested directories', async () => {
    const nestedDir = path.join(tmpDir, 'nested');
    const deeperDir = path.join(nestedDir, 'deeper');

    await fs.mkdir(deeperDir, { recursive: true });

    await fs.writeFile(path.join(tmpDir, 'alpha.ts'), 'export const alpha = 1;');
    await fs.writeFile(
      path.join(nestedDir, 'bravo.ts'),
      `
        export interface Bravo {}
        export default function bravo() {}
      `,
      'utf-8',
    );
    await fs.writeFile(
      path.join(deeperDir, 'charlie.ts'),
      `
        export { default as charlie } from './impl';
      `,
      'utf-8',
    );
    await fs.writeFile(
      path.join(deeperDir, 'impl.ts'),
      'export default function impl() {}',
      'utf-8',
    );

    const generator = new BarrelFileGenerator();
    const rootUri = { fsPath: tmpDir } as unknown as Uri;
    await generator.generateBarrelFile(rootUri, { recursive: true });

    const rootIndex = await fs.readFile(path.join(tmpDir, 'index.ts'), 'utf-8');
    const nestedIndex = await fs.readFile(path.join(nestedDir, 'index.ts'), 'utf-8');
    const deeperIndex = await fs.readFile(path.join(deeperDir, 'index.ts'), 'utf-8');

    expect(rootIndex).toBe(
      ["export { alpha } from './alpha';", "export * from './nested';", ''].join('\n'),
    );

    expect(nestedIndex).toBe(
      [
        "export { Bravo } from './bravo';",
        "export { default } from './bravo';",
        "export * from './deeper';",
        '',
      ].join('\n'),
    );

    expect(deeperIndex).toBe(
      ["export { charlie } from './charlie';", "export { default } from './impl';", ''].join('\n'),
    );
  });

  it('sanitizes existing barrels when updating', async () => {
    const generator = new BarrelFileGenerator();
    const rootUri = { fsPath: tmpDir } as unknown as Uri;

    await fs.writeFile(path.join(tmpDir, 'index.ts'), "export * from '../outside';", 'utf-8');

    await generator.generateBarrelFile(rootUri, { mode: 'updateExisting' });

    const rootIndex = await fs.readFile(path.join(tmpDir, 'index.ts'), 'utf-8');

    expect(rootIndex).toBe('\n');
  });

  it('skips creating barrels when updating non-existent ones', async () => {
    const generator = new BarrelFileGenerator();
    const nestedDir = path.join(tmpDir, 'missing');
    await fs.mkdir(nestedDir);

    const nestedUri = { fsPath: nestedDir } as unknown as Uri;
    await generator.generateBarrelFile(nestedUri, { mode: 'updateExisting' });

    await expect(fs.stat(path.join(nestedDir, 'index.ts'))).rejects.toThrow();
  });
});
