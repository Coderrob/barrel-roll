/* eslint-disable @typescript-eslint/no-floating-promises */

import assert from 'node:assert/strict';
import { Dirent } from 'node:fs';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';

import { afterEach, beforeEach, describe, it, jest } from '../../test/testHarness.js';
import { INDEX_FILENAME } from '../../types/index.js';
import { FileSystemService } from './file-system.service.js';

async function testEntriesFiltering(
  testCases: Array<{ entry: Dirent; shouldInclude: boolean }>,
  methodUnderTest: (path: string) => Promise<string[]>,
  directoryPath: string,
  testNamePrefix: string,
): Promise<void> {
  for (const [index, { entry, shouldInclude }] of testCases.entries()) {
    it(`${testNamePrefix} ${index}`, async () => {
      const readdirMock = jest.spyOn(fs, 'readdir').mockResolvedValue([entry] as never);

      const result = await methodUnderTest(directoryPath);

      const expectedPath = path.join(directoryPath, entry.name);
      const expected = shouldInclude ? [expectedPath] : [];

      assert.deepStrictEqual(result, expected);
      assert.deepStrictEqual(readdirMock.mock.calls, [[directoryPath, { withFileTypes: true }]]);
    });
  }
}

describe('FileSystemService', () => {
  let service: FileSystemService;

  const createFileEntry = (name: string): Dirent =>
    ({
      name,
      isFile: () => true,
      isDirectory: () => false,
    }) as unknown as Dirent;

  const createDirectoryEntry = (name: string): Dirent =>
    ({
      name,
      isFile: () => false,
      isDirectory: () => true,
    }) as unknown as Dirent;

  beforeEach(() => {
    service = new FileSystemService();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('getTypeScriptFiles', () => {
    const directoryPath = '/path/to/dir';

    it('should return TypeScript files excluding index.ts and definition files', async () => {
      const mockEntries: Dirent[] = [
        createFileEntry('file.ts'),
        createFileEntry(INDEX_FILENAME),
        createFileEntry('types.d.ts'),
        createFileEntry('component.tsx'),
        createDirectoryEntry('nested'),
      ];
      const readdirMock = jest.spyOn(fs, 'readdir').mockResolvedValue(mockEntries as never);

      const result = await service.getTypeScriptFiles(directoryPath);

      assert.deepStrictEqual(result, [
        path.join(directoryPath, 'file.ts'),
        path.join(directoryPath, 'component.tsx'),
      ]);
      assert.deepStrictEqual(readdirMock.mock.calls, [[directoryPath, { withFileTypes: true }]]);
    });

    const typeScriptEntryCases: Array<{ entry: Dirent; shouldInclude: boolean }> = [
      { entry: createFileEntry('alpha.ts'), shouldInclude: true },
      { entry: createFileEntry('component.tsx'), shouldInclude: true },
      { entry: createFileEntry(INDEX_FILENAME), shouldInclude: false },
      { entry: createFileEntry('types.d.ts'), shouldInclude: false },
      { entry: createFileEntry('main.js'), shouldInclude: false },
      { entry: createDirectoryEntry('nested'), shouldInclude: false },
    ];

    testEntriesFiltering(
      typeScriptEntryCases,
      (path) => service.getTypeScriptFiles(path),
      directoryPath,
      'should handle TypeScript entry filtering',
    );

    it('should throw error if directory read fails', async () => {
      jest.spyOn(fs, 'readdir').mockRejectedValue(new Error('Read error'));

      await assert.rejects(
        service.getTypeScriptFiles('/invalid/path'),
        /Failed to read directory: Read error/,
      );
    });
  });

  describe('getSubdirectories', () => {
    const directoryPath = '/path/to/dir';

    it('should return traversable subdirectories', async () => {
      const mockEntries: Dirent[] = [
        createDirectoryEntry('subdir'),
        createDirectoryEntry('node_modules'),
        createDirectoryEntry('.hidden'),
        createFileEntry('file.ts'),
      ];
      const readdirMock = jest.spyOn(fs, 'readdir').mockResolvedValue(mockEntries as never);

      const result = await service.getSubdirectories(directoryPath);

      assert.deepStrictEqual(result, [path.join(directoryPath, 'subdir')]);
      assert.deepStrictEqual(readdirMock.mock.calls, [[directoryPath, { withFileTypes: true }]]);
    });

    const subdirectoryCases: Array<{ entry: Dirent; shouldInclude: boolean }> = [
      { entry: createDirectoryEntry('components'), shouldInclude: true },
      { entry: createDirectoryEntry('node_modules'), shouldInclude: false },
      { entry: createDirectoryEntry('.git'), shouldInclude: false },
      { entry: createFileEntry('readme.md'), shouldInclude: false },
    ];

    testEntriesFiltering(
      subdirectoryCases,
      (path) => service.getSubdirectories(path),
      directoryPath,
      'should handle subdirectory filtering',
    );

    it('should throw error if directory read fails', async () => {
      jest.spyOn(fs, 'readdir').mockRejectedValue(new Error('Read error'));

      await assert.rejects(
        service.getSubdirectories('/invalid/path'),
        /Failed to read directory: Read error/,
      );
    });
  });

  describe('readFile', () => {
    it('should read file content successfully', async () => {
      const readFileMock = jest.spyOn(fs, 'readFile').mockResolvedValue('file content' as never);

      const result = await service.readFile('/path/to/file.ts');

      assert.strictEqual(result, 'file content');
      assert.deepStrictEqual(readFileMock.mock.calls, [['/path/to/file.ts', 'utf-8']]);
    });

    it('should throw error if file read fails', async () => {
      jest.spyOn(fs, 'readFile').mockRejectedValue(new Error('Read error'));

      await assert.rejects(
        service.readFile('/invalid/path'),
        /Failed to read file \/invalid\/path: Read error/,
      );
    });
  });

  describe('writeFile', () => {
    it('should write file content successfully', async () => {
      const writeFileMock = jest.spyOn(fs, 'writeFile').mockResolvedValue(undefined as never);

      await service.writeFile('/path/to/file.ts', 'content');

      assert.deepStrictEqual(writeFileMock.mock.calls, [['/path/to/file.ts', 'content', 'utf-8']]);
    });

    it('should throw error if file write fails', async () => {
      jest.spyOn(fs, 'writeFile').mockRejectedValue(new Error('Write error'));

      await assert.rejects(
        service.writeFile('/invalid/path', 'content'),
        /Failed to write file \/invalid\/path: Write error/,
      );
    });
  });

  describe('ensureDirectory', () => {
    it('should create directory recursively', async () => {
      const mkdirMock = jest.spyOn(fs, 'mkdir').mockResolvedValue(undefined as never);

      await service.ensureDirectory('/path/to/dir');

      assert.deepStrictEqual(mkdirMock.mock.calls, [['/path/to/dir', { recursive: true }]]);
    });

    it('should throw error when directory creation fails', async () => {
      jest.spyOn(fs, 'mkdir').mockRejectedValue(new Error('mkdir error'));

      await assert.rejects(
        service.ensureDirectory('/path/to/dir'),
        /Failed to create directory \/path\/to\/dir: mkdir error/,
      );
    });
  });

  describe('removePath', () => {
    it('should remove path recursively', async () => {
      const rmMock = jest.spyOn(fs, 'rm').mockResolvedValue(undefined as never);

      await service.removePath('/path/to/remove');

      assert.deepStrictEqual(rmMock.mock.calls, [
        ['/path/to/remove', { recursive: true, force: true }],
      ]);
    });

    it('should throw error when removal fails', async () => {
      jest.spyOn(fs, 'rm').mockRejectedValue(new Error('rm error'));

      await assert.rejects(
        service.removePath('/path/to/remove'),
        /Failed to remove path \/path\/to\/remove: rm error/,
      );
    });
  });

  describe('createTempDirectory', () => {
    it('should create temp directory with prefix', async () => {
      const mkdtempMock = jest.spyOn(fs, 'mkdtemp').mockResolvedValue('/tmp/foo123' as never);

      const result = await service.createTempDirectory('/tmp/foo-');

      assert.strictEqual(result, '/tmp/foo123');
      assert.deepStrictEqual(mkdtempMock.mock.calls, [['/tmp/foo-']]);
    });

    it('should throw error when temp directory creation fails', async () => {
      jest.spyOn(fs, 'mkdtemp').mockRejectedValue(new Error('mkdtemp error'));

      await assert.rejects(
        service.createTempDirectory('/tmp/foo-'),
        /Failed to create temporary directory with prefix \/tmp\/foo-: mkdtemp error/,
      );
    });
  });

  describe('fileExists', () => {
    const fileExistsCases = [true, false] as const;

    for (const [index, expected] of fileExistsCases.entries()) {
      it(`should evaluate file existence ${index}`, async () => {
        const filePath = expected ? '/path/to/file.ts' : '/invalid/path';
        const accessMock = jest.spyOn(fs, 'access');

        if (expected) {
          accessMock.mockResolvedValue(undefined as never);
        } else {
          accessMock.mockRejectedValue(new Error('Access error'));
        }

        const result = await service.fileExists(filePath);

        assert.strictEqual(result, expected);
        assert.deepStrictEqual(accessMock.mock.calls, [[filePath]]);
      });
    }
  });
});
