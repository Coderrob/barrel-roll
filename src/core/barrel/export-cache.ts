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

import type { IParsedExport } from '../../types/index.js';

/**
 * Minimal file system interface required by ExportCache.
 */
export interface ExportCacheFileSystem {
  getFileStats(filePath: string): Promise<{ mtime: Date }>;
  readFile(filePath: string): Promise<string>;
}

/**
 * Minimal export parser interface required by ExportCache.
 */
export interface ExportCacheParser {
  extractExports(content: string): IParsedExport[];
}

/**
 * Represents cached export information for a file.
 */
export interface CachedExport {
  exports: IParsedExport[];
  mtime: number;
}

/**
 * Configuration options for the export cache.
 */
export interface ExportCacheOptions {
  /** Maximum number of entries to cache. Default: 1000 */
  maxSize?: number;
}

/**
 * Cache for parsed exports to avoid re-parsing unchanged files.
 * Uses file modification time to invalidate stale entries.
 */
export class ExportCache {
  private readonly cache = new Map<string, CachedExport>();
  private readonly maxSize: number;

  /**
   * Creates a new ExportCache instance.
   * @param fileSystemService File system service for reading files and stats.
   * @param exportParser Export parser for parsing file content.
   * @param options Cache configuration options.
   */
  constructor(
    private readonly fileSystemService: ExportCacheFileSystem,
    private readonly exportParser: ExportCacheParser,
    options?: ExportCacheOptions,
  ) {
    this.maxSize = options?.maxSize ?? 1000;
  }

  /**
   * Gets exports for a file, using cache if available and valid.
   * @param filePath The file path to get exports for.
   * @returns Promise that resolves to the parsed exports.
   */
  async getExports(filePath: string): Promise<IParsedExport[]> {
    const stats = await this.fileSystemService.getFileStats(filePath);
    const currentMtime = stats.mtime.getTime();

    // Check cache first
    const cached = this.cache.get(filePath);
    if (cached?.mtime === currentMtime) {
      return cached.exports;
    }

    // Parse and cache the exports
    const content = await this.fileSystemService.readFile(filePath);
    const exports = this.exportParser.extractExports(content);

    // Cache with modification time
    this.cache.set(filePath, { exports, mtime: currentMtime });

    // Evict oldest entry if over capacity
    this.evictIfNeeded();

    return exports;
  }

  /**
   * Clears all cached entries.
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Returns the current number of cached entries.
   */
  get size(): number {
    return this.cache.size;
  }

  /**
   * Evicts the oldest entry if cache exceeds max size.
   */
  private evictIfNeeded(): void {
    if (this.cache.size <= this.maxSize) {
      return;
    }

    const firstKey = this.cache.keys().next().value;
    if (!firstKey) {
      return;
    }

    this.cache.delete(firstKey);
  }
}
