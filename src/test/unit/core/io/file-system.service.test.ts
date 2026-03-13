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
import { Dirent } from 'node:fs';
import * as path from 'node:path';
import { beforeEach, describe, it } from 'node:test';

import { FileSystemService } from '../../../../core/io/file-system.service.js';
import { INDEX_FILENAME } from '../../../../types/index.js';

describe('FileSystemService', () => {
  let service: FileSystemService;
  let mockFs: any;

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

  /**
   *
   */
  async function testEntriesFiltering(
    testCases: Array<{ entry: Dirent; shouldInclude: boolean }>,
    methodUnderTest: (path: string) => Promise<string[]>,
    directoryPath: string,
    testNamePrefix: string,
  ): Promise<void> {
    for (const [index, { entry, shouldInclude }] of testCases.entries()) {
      it(`${testNamePrefix} ${index}`, async () => {
        mockFs.readdir.mockResolvedValueOnce([entry] as never);

        const result = await methodUnderTest(directoryPath);

        const expectedPath = path.join(directoryPath, entry.name);
        const expected = shouldInclude ? [expectedPath] : [];

        assert.deepStrictEqual(result, expected);
        assert.deepStrictEqual(mockFs.readdir.mock.calls, [
          [directoryPath, { withFileTypes: true }],
        ]);
      });
    }
  }

  beforeEach(() => {
    const createMockFunction = () => {
      const calls: any[][] = [];
      let resolvedValue: any = undefined;
      let rejectedValue: any = undefined;

      const mockFn = ((...args: any[]) => {
        calls.push(args);
        if (rejectedValue !== undefined) {
          return Promise.reject(rejectedValue);
        }
        return Promise.resolve(resolvedValue);
      }) as any;

      mockFn.mock = { calls };
      mockFn.mockResolvedValueOnce = (value: any) => {
        resolvedValue = value;
        rejectedValue = undefined;
        return mockFn;
      };
      mockFn.mockRejectedValueOnce = (error: any) => {
        rejectedValue = error;
        resolvedValue = undefined;
        return mockFn;
      };

      return mockFn;
    };

    mockFs = {
      readFile: createMockFunction(),
      writeFile: createMockFunction(),
      mkdir: createMockFunction(),
      rm: createMockFunction(),
      mkdtemp: createMockFunction(),
      access: createMockFunction(),
      readdir: createMockFunction(),
      stat: createMockFunction(),
    };

    // Set default implementations
    mockFs.readFile.mockResolvedValueOnce('');
    mockFs.writeFile.mockResolvedValueOnce(undefined);
    mockFs.mkdir.mockResolvedValueOnce(undefined);
    mockFs.rm.mockResolvedValueOnce(undefined);
    mockFs.mkdtemp.mockResolvedValueOnce('');
    mockFs.access.mockResolvedValueOnce(undefined);
    mockFs.readdir.mockResolvedValueOnce([]);

    service = new FileSystemService(mockFs);
  });

  it('should use default fs when no argument provided', () => {
    const service = new FileSystemService();
    // Module identity can differ in test runtime; verify expected API surface instead
    assert.strictEqual(typeof service['fs'].readFile, 'function');
    assert.strictEqual(typeof service['fs'].writeFile, 'function');
  });

  describe('getTypeScriptFiles', () => {
    const directoryPath = '/path/to/dir';

    it('should return TypeScript files excluding index.ts and definition files', async () => {
      const mockEntries: Dirent[] = [
        createFileEntry('file.ts'),
        createFileEntry(INDEX_FILENAME),
        createFileEntry('types.d.ts'),
        createFileEntry('component.tsx'),
        createFileEntry('file.spec.ts'),
        createFileEntry('file.test.ts'),
        createFileEntry('component.spec.tsx'),
        createFileEntry('component.test.tsx'),
        createDirectoryEntry('nested'),
      ];
      mockFs.readdir.mockResolvedValueOnce(mockEntries as never);

      const result = await service.getTypeScriptFiles(directoryPath);

      assert.deepStrictEqual(result, [
        path.join(directoryPath, 'file.ts'),
        path.join(directoryPath, 'component.tsx'),
      ]);
      assert.deepStrictEqual(mockFs.readdir.mock.calls, [[directoryPath, { withFileTypes: true }]]);
    });

    const typeScriptEntryCases: Array<{ entry: Dirent; shouldInclude: boolean }> = [
      { entry: createFileEntry('alpha.ts'), shouldInclude: true },
      { entry: createFileEntry('component.tsx'), shouldInclude: true },
      { entry: createFileEntry(INDEX_FILENAME), shouldInclude: false },
      { entry: createFileEntry('types.d.ts'), shouldInclude: false },
      { entry: createFileEntry('file.spec.ts'), shouldInclude: false },
      { entry: createFileEntry('file.test.ts'), shouldInclude: false },
      { entry: createFileEntry('component.spec.tsx'), shouldInclude: false },
      { entry: createFileEntry('component.test.tsx'), shouldInclude: false },
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
      mockFs.readdir.mockRejectedValueOnce(new Error('Read error'));

      await assert.rejects(
        service.getTypeScriptFiles('/invalid/path'),
        /Failed to read directory: Read error/,
      );
    });

    it('should throw error if directory read fails with non-Error object', async () => {
      mockFs.readdir.mockRejectedValueOnce('String error');

      await assert.rejects(
        service.getTypeScriptFiles('/invalid/path'),
        /Failed to read directory: String error/,
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
      mockFs.readdir.mockResolvedValueOnce(mockEntries as never);

      const result = await service.getSubdirectories(directoryPath);

      assert.deepStrictEqual(result, [path.join(directoryPath, 'subdir')]);
      assert.deepStrictEqual(mockFs.readdir.mock.calls, [[directoryPath, { withFileTypes: true }]]);
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
      mockFs.readdir.mockRejectedValueOnce(new Error('Read error'));

      await assert.rejects(
        service.getSubdirectories('/invalid/path'),
        /Failed to read directory: Read error/,
      );
    });

    it('should throw error if directory read fails with non-Error object', async () => {
      mockFs.readdir.mockRejectedValueOnce('String error');

      await assert.rejects(
        service.getSubdirectories('/invalid/path'),
        /Failed to read directory: String error/,
      );
    });
  });

  describe('readFile', () => {
    it('should read file content successfully', async () => {
      mockFs.stat.mockResolvedValueOnce({ size: 1024, mtime: new Date() });
      mockFs.readFile.mockResolvedValueOnce('file content');

      const result = await service.readFile('/path/to/file.ts');

      assert.strictEqual(result, 'file content');
      assert.deepStrictEqual(mockFs.readFile.mock.calls, [['/path/to/file.ts', 'utf-8']]);
    });

    it('should throw error if file read fails', async () => {
      mockFs.stat.mockResolvedValueOnce({ size: 1024, mtime: new Date() });
      mockFs.readFile.mockRejectedValueOnce(new Error('Read error'));

      await assert.rejects(
        service.readFile('/invalid/path'),
        /Failed to read file \/invalid\/path: Read error/,
      );
    });

    it('should throw error if file read fails with non-Error object', async () => {
      mockFs.stat.mockResolvedValueOnce({ size: 1024, mtime: new Date() });
      mockFs.readFile.mockRejectedValueOnce({ custom: 'error' });

      await assert.rejects(
        service.readFile('/invalid/path'),
        /Failed to read file \/invalid\/path: \[object Object\]/,
      );
    });

    it('should throw error if file is too large', async () => {
      mockFs.stat.mockResolvedValueOnce({ size: 15 * 1024 * 1024, mtime: new Date() }); // 15MB

      await assert.rejects(
        service.readFile('/path/to/large-file.ts'),
        /File \/path\/to\/large-file\.ts is too large \(15\.00MB\)\. Maximum allowed size is 10MB\./,
      );
    });
  });

  describe('writeFile', () => {
    it('should write file content successfully', async () => {
      mockFs.writeFile.mockResolvedValueOnce(undefined as never);

      await service.writeFile('/path/to/file.ts', 'content');

      assert.deepStrictEqual(mockFs.writeFile.mock.calls, [
        ['/path/to/file.ts', 'content', 'utf-8'],
      ]);
    });

    it('should throw error if file write fails', async () => {
      mockFs.writeFile.mockRejectedValueOnce(new Error('Write error'));

      await assert.rejects(
        service.writeFile('/invalid/path', 'content'),
        /Failed to write file \/invalid\/path: Write error/,
      );
    });

    it('should throw error if file write fails with non-Error object', async () => {
      mockFs.writeFile.mockRejectedValueOnce('String error');

      await assert.rejects(
        service.writeFile('/invalid/path', 'content'),
        /Failed to write file \/invalid\/path: String error/,
      );
    });
  });

  describe('ensureDirectory', () => {
    it('should create directory recursively', async () => {
      mockFs.mkdir.mockResolvedValueOnce(undefined as never);

      await service.ensureDirectory('/path/to/dir');

      assert.deepStrictEqual(mockFs.mkdir.mock.calls, [['/path/to/dir', { recursive: true }]]);
    });

    it('should throw error when directory creation fails', async () => {
      mockFs.mkdir.mockRejectedValueOnce(new Error('mkdir error'));

      await assert.rejects(
        service.ensureDirectory('/path/to/dir'),
        /Failed to create directory \/path\/to\/dir: mkdir error/,
      );
    });

    it('should throw error when directory creation fails with non-Error object', async () => {
      mockFs.mkdir.mockRejectedValueOnce('String error');

      await assert.rejects(
        service.ensureDirectory('/path/to/dir'),
        /Failed to create directory \/path\/to\/dir: String error/,
      );
    });
  });

  describe('removePath', () => {
    it('should remove path recursively', async () => {
      mockFs.rm.mockResolvedValueOnce(undefined as never);

      await service.removePath('/path/to/remove');

      assert.deepStrictEqual(mockFs.rm.mock.calls, [
        ['/path/to/remove', { recursive: true, force: true }],
      ]);
    });

    it('should throw error when removal fails', async () => {
      mockFs.rm.mockRejectedValueOnce(new Error('rm error'));

      await assert.rejects(
        service.removePath('/path/to/remove'),
        /Failed to remove path \/path\/to\/remove: rm error/,
      );
    });

    it('should throw error when removal fails with non-Error object', async () => {
      mockFs.rm.mockRejectedValueOnce('String error');

      await assert.rejects(
        service.removePath('/path/to/remove'),
        /Failed to remove path \/path\/to\/remove: String error/,
      );
    });
  });

  describe('createTempDirectory', () => {
    it('should create temp directory with prefix', async () => {
      mockFs.mkdtemp.mockResolvedValueOnce('/tmp/foo123' as never);

      const result = await service.createTempDirectory('/tmp/foo-');

      assert.strictEqual(result, '/tmp/foo123');
      assert.deepStrictEqual(mockFs.mkdtemp.mock.calls, [['/tmp/foo-']]);
    });

    it('should throw error when temp directory creation fails', async () => {
      mockFs.mkdtemp.mockRejectedValueOnce(new Error('mkdtemp error'));

      await assert.rejects(
        service.createTempDirectory('/tmp/foo-'),
        /Failed to create temporary directory with prefix \/tmp\/foo-: mkdtemp error/,
      );
    });

    it('should throw error when temp directory creation fails with non-Error object', async () => {
      mockFs.mkdtemp.mockRejectedValueOnce('String error');

      await assert.rejects(
        service.createTempDirectory('/tmp/foo-'),
        /Failed to create temporary directory with prefix \/tmp\/foo-: String error/,
      );
    });
  });

  describe('fileExists', () => {
    const fileExistsCases = [true, false] as const;

    for (const [index, expected] of fileExistsCases.entries()) {
      it(`should evaluate file existence ${index}`, async () => {
        const filePath = expected ? '/path/to/file.ts' : '/invalid/path';
        if (expected) {
          mockFs.access.mockResolvedValueOnce(undefined as never);
        } else {
          mockFs.access.mockRejectedValueOnce(new Error('Access error'));
        }

        const result = await service.fileExists(filePath);

        assert.strictEqual(result, expected);
        assert.deepStrictEqual(mockFs.access.mock.calls, [[filePath]]);
      });
    }
  });

  describe('isDirectory', () => {
    const isDirectoryCases = [true, false] as const;

    for (const [index, expected] of isDirectoryCases.entries()) {
      it(`should evaluate if path is directory ${index}`, async () => {
        const filePath = expected ? '/path/to/directory' : '/path/to/file.ts';
        mockFs.stat.mockResolvedValueOnce({
          isDirectory: () => expected,
        } as never);

        const result = await service.isDirectory(filePath);

        assert.strictEqual(result, expected);
        assert.deepStrictEqual(mockFs.stat.mock.calls, [[filePath]]);
      });
    }

    it('should return false when stat fails', async () => {
      const filePath = '/invalid/path';
      mockFs.stat.mockRejectedValueOnce(new Error('Stat error'));

      const result = await service.isDirectory(filePath);

      assert.strictEqual(result, false);
      assert.deepStrictEqual(mockFs.stat.mock.calls, [[filePath]]);
    });
  });
});
