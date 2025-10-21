import { Dirent } from 'fs';
import * as fs from 'fs/promises';
import * as path from 'path';

import { beforeEach, describe, expect, it } from '@jest/globals';

import { FileSystemService } from '../../../core/services/file-system.service.js';

jest.mock('fs/promises');

describe('FileSystemService', () => {
  let service: FileSystemService;
  const mockFs = fs as jest.Mocked<typeof fs>;

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
    jest.clearAllMocks();
  });

  describe('getTypeScriptFiles', () => {
    const directoryPath = '/path/to/dir';

    it('should return TypeScript files excluding index.ts and definition files', async () => {
      const mockEntries: Dirent[] = [
        createFileEntry('file.ts'),
        createFileEntry('index.ts'),
        createFileEntry('types.d.ts'),
        createFileEntry('component.tsx'),
        createDirectoryEntry('nested'),
      ];
      mockFs.readdir.mockResolvedValue(mockEntries as never);

      const result = await service.getTypeScriptFiles(directoryPath);

      expect(result).toEqual([
        path.join(directoryPath, 'file.ts'),
        path.join(directoryPath, 'component.tsx'),
      ]);
      expect(mockFs.readdir).toHaveBeenCalledWith(directoryPath, { withFileTypes: true });
    });

    const typeScriptEntryCases: Array<{ entry: Dirent; shouldInclude: boolean }> = [
      { entry: createFileEntry('alpha.ts'), shouldInclude: true },
      { entry: createFileEntry('component.tsx'), shouldInclude: true },
      { entry: createFileEntry('index.ts'), shouldInclude: false },
      { entry: createFileEntry('types.d.ts'), shouldInclude: false },
      { entry: createFileEntry('main.js'), shouldInclude: false },
      { entry: createDirectoryEntry('nested'), shouldInclude: false },
    ];

    // Data-table cases omit natural language labels per team convention; add individual tests when additional context is needed.
    it.each(typeScriptEntryCases)(
      'should handle TypeScript entry filtering %#',
      async ({ entry, shouldInclude }) => {
        mockFs.readdir.mockResolvedValue([entry] as never);

        const result = await service.getTypeScriptFiles(directoryPath);

        const expectedPath = path.join(directoryPath, entry.name);
        expect(result).toEqual(shouldInclude ? [expectedPath] : []);
      },
    );

    it('should throw error if directory read fails', async () => {
      mockFs.readdir.mockRejectedValue(new Error('Read error'));

      await expect(service.getTypeScriptFiles('/invalid/path')).rejects.toThrow(
        'Failed to read directory: Read error',
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
      mockFs.readdir.mockResolvedValue(mockEntries as never);

      const result = await service.getSubdirectories(directoryPath);

      expect(result).toEqual([path.join(directoryPath, 'subdir')]);
      expect(mockFs.readdir).toHaveBeenCalledWith(directoryPath, { withFileTypes: true });
    });

    const subdirectoryCases: Array<{ entry: Dirent; shouldInclude: boolean }> = [
      { entry: createDirectoryEntry('components'), shouldInclude: true },
      { entry: createDirectoryEntry('node_modules'), shouldInclude: false },
      { entry: createDirectoryEntry('.git'), shouldInclude: false },
      { entry: createFileEntry('readme.md'), shouldInclude: false },
    ];

    it.each(subdirectoryCases)(
      'should handle subdirectory filtering %#',
      async ({ entry, shouldInclude }) => {
        mockFs.readdir.mockResolvedValue([entry] as never);

        const result = await service.getSubdirectories(directoryPath);

        const expectedPath = path.join(directoryPath, entry.name);
        expect(result).toEqual(shouldInclude ? [expectedPath] : []);
      },
    );

    it('should throw error if directory read fails', async () => {
      mockFs.readdir.mockRejectedValue(new Error('Read error'));

      await expect(service.getSubdirectories('/invalid/path')).rejects.toThrow(
        'Failed to read directory: Read error',
      );
    });
  });

  describe('readFile', () => {
    it('should read file content successfully', async () => {
      mockFs.readFile.mockResolvedValue('file content');

      const result = await service.readFile('/path/to/file.ts');

      expect(result).toBe('file content');
      expect(mockFs.readFile).toHaveBeenCalledWith('/path/to/file.ts', 'utf-8');
    });

    it('should throw error if file read fails', async () => {
      mockFs.readFile.mockRejectedValue(new Error('Read error'));

      await expect(service.readFile('/invalid/path')).rejects.toThrow(
        'Failed to read file /invalid/path: Read error',
      );
    });
  });

  describe('writeFile', () => {
    it('should write file content successfully', async () => {
      mockFs.writeFile.mockResolvedValue(undefined);

      await service.writeFile('/path/to/file.ts', 'content');

      expect(mockFs.writeFile).toHaveBeenCalledWith('/path/to/file.ts', 'content', 'utf-8');
    });

    it('should throw error if file write fails', async () => {
      mockFs.writeFile.mockRejectedValue(new Error('Write error'));

      await expect(service.writeFile('/invalid/path', 'content')).rejects.toThrow(
        'Failed to write file /invalid/path: Write error',
      );
    });
  });

  describe('fileExists', () => {
    const fileExistsCases = [true, false] as const;

    it.each(fileExistsCases)('should evaluate file existence %#', async (expected) => {
      const filePath = expected ? '/path/to/file.ts' : '/invalid/path';

      if (expected) {
        mockFs.access.mockResolvedValue(undefined);
      } else {
        mockFs.access.mockRejectedValue(new Error('Access error'));
      }

      const result = await service.fileExists(filePath);

      expect(result).toBe(expected);
      expect(mockFs.access).toHaveBeenCalledWith(filePath);
    });
  });
});
