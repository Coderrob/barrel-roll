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
import { describe, it } from 'node:test';

import { ExportCache } from '../../../../core/barrel/export-cache.js';
import type { IParsedExport } from '../../../../types/index.js';

type FakeFile = {
  content: string;
  filePath: string;
  mtime: Date;
};

/** Fake file system service for testing ExportCache. */
class FakeFileSystemService {
  private files: FakeFile[] = [];

  /** Registers fake file content and modification time. */
  setFile(filePath: string, content: string, mtime: Readonly<Date>): void {
    this.files = [
      ...this.files.filter((candidate) => candidate.filePath !== filePath),
      { content, filePath, mtime },
    ];
  }

  /** Returns fake file stats for the given path. */
  async getFileStats(filePath: string): Promise<{ mtime: Date }> {
    const file = this.files.find((candidate) => candidate.filePath === filePath);
    if (!file) {
      throw new Error(`Missing stats for ${filePath}`);
    }
    return { mtime: file.mtime };
  }

  /** Returns fake file content for the given path. */
  async readFile(filePath: string): Promise<string> {
    const file = this.files.find((candidate) => candidate.filePath === filePath);
    if (!file) {
      throw new Error(`Missing content for ${filePath}`);
    }
    return file.content;
  }
}

/** Fake export parser for testing ExportCache. */
class FakeExportParser {
  calls = 0;

  /** Parses comma-separated names as exports. */
  extractExports(content: string): IParsedExport[] {
    this.calls++;
    return content
      .split(',')
      .filter(Boolean)
      .map((name) => ({ name, typeOnly: false }));
  }
}

describe('ExportCache', () => {
  it('should reuse cached exports when the mtime is unchanged', async () => {
    const fileSystem = new FakeFileSystemService();
    const parser = new FakeExportParser();
    const cache = new ExportCache(fileSystem, parser);

    const filePath = '/tmp/alpha.ts';
    const mtime = new Date('2025-01-01T00:00:00Z');
    fileSystem.setFile(filePath, 'alpha,beta', mtime);

    const first = await cache.resolveExports(filePath);
    const second = await cache.resolveExports(filePath);

    assert.deepStrictEqual(first, second);
    assert.strictEqual(parser.calls, 1);
  });

  it('should evict the oldest entry when max size is exceeded', async () => {
    const fileSystem = new FakeFileSystemService();
    const parser = new FakeExportParser();
    const cache = new ExportCache(fileSystem, parser, { maxSize: 1 });

    const firstPath = '/tmp/first.ts';
    const secondPath = '/tmp/second.ts';
    fileSystem.setFile(firstPath, 'first', new Date('2025-01-01T00:00:00Z'));
    fileSystem.setFile(secondPath, 'second', new Date('2025-01-02T00:00:00Z'));

    await cache.resolveExports(firstPath);
    await cache.resolveExports(secondPath);
    await cache.resolveExports(firstPath);

    assert.strictEqual(cache.size, 1);
    assert.strictEqual(parser.calls, 3);
  });

  it('should invalidate changed files and clear retained entries', async () => {
    const fileSystem = new FakeFileSystemService();
    const parser = new FakeExportParser();
    const cache = new ExportCache(fileSystem, parser);
    const filePath = '/tmp/changing.ts';

    fileSystem.setFile(filePath, 'first', new Date('2025-01-01T00:00:00Z'));
    await cache.resolveExports(filePath);
    fileSystem.setFile(filePath, 'second', new Date('2025-01-02T00:00:00Z'));

    assert.deepStrictEqual(await cache.resolveExports(filePath), [
      { name: 'second', typeOnly: false },
    ]);
    assert.strictEqual(cache.size, 1);

    cache.clear();

    assert.strictEqual(cache.size, 0);
  });

  it('should evict an entry whose path is an empty string', async () => {
    const fileSystem = new FakeFileSystemService();
    const cache = new ExportCache(fileSystem, new FakeExportParser(), { maxSize: 0 });
    fileSystem.setFile('', 'empty-path', new Date('2025-01-01T00:00:00Z'));

    await cache.resolveExports('');

    assert.strictEqual(cache.size, 0);
  });
});
