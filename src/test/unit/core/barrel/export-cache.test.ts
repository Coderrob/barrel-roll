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

import type { IParsedExport } from '../../../../types/index.js';
import { ExportCache } from '../../../../core/barrel/export-cache.js';

/** Fake file system service for testing ExportCache. */
class FakeFileSystemService {
  private readonly stats = new Map<string, Date>();
  private readonly contents = new Map<string, string>();

  /** Registers fake file content and modification time. */
  setFile(filePath: string, content: string, mtime: Date): void {
    this.contents.set(filePath, content);
    this.stats.set(filePath, mtime);
  }

  /** Returns fake file stats for the given path. */
  async getFileStats(filePath: string): Promise<{ mtime: Date }> {
    const mtime = this.stats.get(filePath);
    if (!mtime) {
      throw new Error(`Missing stats for ${filePath}`);
    }
    return { mtime };
  }

  /** Returns fake file content for the given path. */
  async readFile(filePath: string): Promise<string> {
    const content = this.contents.get(filePath);
    if (content === undefined) {
      throw new Error(`Missing content for ${filePath}`);
    }
    return content;
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

    const first = await cache.getExports(filePath);
    const second = await cache.getExports(filePath);

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

    await cache.getExports(firstPath);
    await cache.getExports(secondPath);
    await cache.getExports(firstPath);

    assert.strictEqual(cache.size, 1);
    assert.strictEqual(parser.calls, 3);
  });
});
