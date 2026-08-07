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
export interface IExportCacheFileSystem {
  getFileStats(filePath: string): Promise<{ mtime: Date }>;
  readFile(filePath: string): Promise<string>;
}

/**
 * Minimal export parser interface required by ExportCache.
 */
export interface IExportCacheParser {
  extractExports(content: string): IParsedExport[];
}

/**
 * Represents cached export information for a file.
 */
export interface ICachedExport {
  exports: IParsedExport[];
  mtime: number;
}

/**
 * Configuration options for the export cache.
 */
export interface IExportCacheOptions {
  /** Maximum number of entries to cache. Default: 1000 */
  maxSize?: number;
}

interface ICacheOperations {
  clear(): void;
  resolve(filePath: string): Promise<IParsedExport[]>;
  size(): number;
}

const DEFAULT_MAX_CACHE_SIZE = 1000;

/**
 * Creates immutable cache operations backed by closure-local state.
 * @param fileSystemService File system used to inspect and read source files.
 * @param exportParser Parser used to extract exports.
 * @param maxSize Maximum number of cached files.
 * @returns Operations over the closure-owned cache.
 */
function createCacheOperations(
  fileSystemService: Readonly<IExportCacheFileSystem>,
  exportParser: Readonly<IExportCacheParser>,
  maxSize: number,
): ICacheOperations {
  let cache: ReadonlyMap<string, ICachedExport> = new Map();
  /** Clears all closure-owned cache entries. */
  const clear = (): void => {
    cache = new Map();
  };
  /**
   * Resolves and caches the exports for one source file.
   * @param filePath Source file path.
   * @returns Parsed exports for the source file.
   */
  const resolve = async (filePath: string): Promise<IParsedExport[]> => {
    const stats = await fileSystemService.getFileStats(filePath);
    const currentMtime = stats.mtime.getTime();
    const cached = cache.get(filePath);
    if (cached?.mtime === currentMtime) return cached.exports;
    const content = await fileSystemService.readFile(filePath);
    const exports = exportParser.extractExports(content);
    cache = upsertCache(cache, filePath, { exports, mtime: currentMtime }, maxSize);
    return exports;
  };
  /**
   * Returns the number of closure-owned cache entries.
   * @returns Current cache size.
   */
  const size = (): number => cache.size;
  return { clear, resolve, size };
}

/**
 * Evicts the oldest entry when a cache exceeds its configured size.
 * @param cache Cache to inspect.
 * @param maxSize Maximum permitted size.
 * @returns The original cache or an evicted copy.
 */
function evictOldest(
  cache: Readonly<ReadonlyMap<string, ICachedExport>>,
  maxSize: number,
): ReadonlyMap<string, ICachedExport> {
  if (cache.size <= maxSize) return cache;
  const firstKey = cache.keys().next().value;
  if (firstKey === undefined) return cache;
  return new Map(Array.from(cache).filter(([key]) => key !== firstKey));
}

/**
 * Returns a cache copy containing an updated entry and applies bounded eviction.
 * @param cache Existing cache.
 * @param filePath File path to update.
 * @param cachedExport Cached export metadata.
 * @param maxSize Maximum permitted size.
 * @returns Updated bounded cache.
 */
function upsertCache(
  cache: Readonly<ReadonlyMap<string, ICachedExport>>,
  filePath: string,
  cachedExport: Readonly<ICachedExport>,
  maxSize: number,
): ReadonlyMap<string, ICachedExport> {
  const entry: readonly [string, ICachedExport] = [filePath, cachedExport];
  return evictOldest(new Map([...cache, entry]), maxSize);
}

/**
 * Cache for parsed exports to avoid re-parsing unchanged files.
 * Uses file modification time to invalidate stale entries.
 */
export class ExportCache {
  private readonly cacheOperations: ICacheOperations;

  /**
   * Creates a new ExportCache instance.
   * @param fileSystemService File system service for reading files and stats.
   * @param exportParser Export parser for parsing file content.
   * @param options Cache configuration options.
   */
  constructor(
    fileSystemService: Readonly<IExportCacheFileSystem>,
    exportParser: Readonly<IExportCacheParser>,
    options?: Readonly<IExportCacheOptions>,
  ) {
    this.cacheOperations = createCacheOperations(
      fileSystemService,
      exportParser,
      options?.maxSize ?? DEFAULT_MAX_CACHE_SIZE,
    );
  }

  /**
   * Resolves exports for a file, using cache if available and valid.
   * @param filePath The file path to get exports for.
   * @returns Promise that resolves to the parsed exports.
   */
  async resolveExports(filePath: string): Promise<IParsedExport[]> {
    return this.cacheOperations.resolve(filePath);
  }

  /**
   * Clears all cached entries.
   */
  clear(): void {
    this.cacheOperations.clear();
  }

  /**
   * Returns the current number of cached entries.
   * @returns Number of file entries currently retained by the bounded cache.
   */
  get size(): number {
    return this.cacheOperations.size();
  }
}
