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

import * as path from 'node:path';

import type { Uri } from 'vscode';

import {
  type BarrelEntry,
  BarrelEntryKind,
  BarrelExport,
  BarrelExportKind,
  BarrelGenerationMode,
  DEFAULT_EXPORT_NAME,
  type IBarrelGenerationOptions,
  type ILoggerInstance,
  INDEX_FILENAME,
  type IParsedExport,
  type NormalizedBarrelGenerationOptions,
  STAR_EXPORT_NAME,
} from '../../types/index.js';
import { processConcurrently } from '../../utils/semaphore.js';
import { FileSystemService } from '../io/file-system.service.js';
import { ExportParser } from '../parser/export.parser.js';
import { BarrelContentBuilder } from './barrel-content.builder.js';
import { BarrelContentSanitizer } from './content-sanitizer.js';
import { ExportCache } from './export-cache.js';
import { detectExtensionFromBarrelContent, extractAllExportPaths } from './export-patterns.js';

type NormalizedGenerationOptions = NormalizedBarrelGenerationOptions;

/**
 * Information about TypeScript files and subdirectories in a directory.
 */
interface IDirectoryInfo {
  tsFiles: string[];
  subdirectories: string[];
}

/**
 * Options for building barrel file content.
 */
interface IBarrelBuildOptions {
  hasExistingIndex: boolean;
}

/**
 * Checks whether a string line contains any non-whitespace content.
 * @param line - The line to check.
 * @returns True if the line is non-empty after trimming.
 */
function isNonEmptyTrimmedLine(line: string): boolean {
  return line.trim().length > 0;
}

/**
 * Service to generate or update a barrel (index.ts) file in a directory.
 */
export class BarrelFileGenerator {
  private readonly barrelContentBuilder: BarrelContentBuilder;
  private readonly fileSystemService: FileSystemService;
  private readonly contentSanitizer: BarrelContentSanitizer;
  private readonly exportCache: ExportCache;

  /**
   * Creates a new BarrelFileGenerator instance.
   * @param fileSystemService Optional file system service instance.
   * @param exportParser Optional export parser instance.
   * @param barrelContentBuilder Optional barrel content builder instance.
   * @param logger Optional logger instance for debug output.
   */
  constructor(
    fileSystemService?: FileSystemService,
    exportParser?: ExportParser,
    barrelContentBuilder?: BarrelContentBuilder,
    logger?: Readonly<ILoggerInstance>,
  ) {
    this.barrelContentBuilder = barrelContentBuilder || new BarrelContentBuilder();
    this.fileSystemService = fileSystemService || new FileSystemService();
    this.contentSanitizer = new BarrelContentSanitizer(logger);
    this.exportCache = new ExportCache(this.fileSystemService, exportParser || new ExportParser());
  }

  /**
   * Generates or updates an index.ts barrel file in the specified directory.
   * @param directoryUri The URI of the directory where the barrel file should be created/updated.
   * @param options Behavioral options for generation.
   * @returns Promise that resolves when barrel files have been created/updated.
   */
  async generateBarrelFile(
    directoryUri: Readonly<Uri>,
    options?: Readonly<IBarrelGenerationOptions>,
  ): Promise<void> {
    const normalizedOptions = this.normalizeOptions(options);
    await this.generateBarrelFileFromPath(directoryUri.fsPath, normalizedOptions);
  }

  /**
   * Generates or updates a barrel file from a given directory path.
   * @param directoryPath The directory path
   * @param options Generation options
   * @param depth Current recursion depth (default: 0)
   * @returns Promise that resolves when the barrel file has been created/updated.
   */
  private async generateBarrelFileFromPath(
    directoryPath: string,
    options: Readonly<NormalizedGenerationOptions>,
    depth = 0,
  ): Promise<void> {
    const barrelFilePath = path.join(directoryPath, INDEX_FILENAME);
    const { tsFiles, subdirectories } = await this.readDirectoryInfo(directoryPath);
    if (options.recursive) {
      await this.processChildDirectories(subdirectories, options, depth);
    }
    const entries = await this.collectEntries(directoryPath, tsFiles, subdirectories);
    await this.writeBarrelIfNeeded(directoryPath, entries, barrelFilePath, options);
  }

  /**
   * Writes the barrel file if content generation conditions are met.
   * @param directoryPath The directory path.
   * @param entries The collected entries.
   * @param barrelFilePath The barrel file path.
   * @param options Normalized generation options.
   * @returns Promise that resolves when done.
   */
  private async writeBarrelIfNeeded(
    directoryPath: string,
    entries: ReadonlyMap<string, BarrelEntry>,
    barrelFilePath: string,
    options: Readonly<NormalizedGenerationOptions>,
  ): Promise<void> {
    const hasExistingIndex = await this.fileSystemService.hasFile(barrelFilePath);
    const buildOptions: IBarrelBuildOptions = { hasExistingIndex };
    if (!this.shouldWriteBarrel(entries, options, buildOptions)) return;
    const barrelContent = await this.buildBarrelContent(
      directoryPath,
      entries,
      barrelFilePath,
      buildOptions,
    );
    await this.fileSystemService.writeFile(barrelFilePath, barrelContent);
  }

  /**
   * Builds the final barrel content, including sanitization of existing content when updating.
   * @param directoryPath The directory path.
   * @param entries The collected entries.
   * @param barrelFilePath The path to the barrel file.
   * @param hasExistingIndex Whether an existing index file exists.
   * @returns The final barrel content.
   */
  private async buildBarrelContent(
    directoryPath: string,
    entries: ReadonlyMap<string, BarrelEntry>,
    barrelFilePath: string,
    buildOptions: Readonly<IBarrelBuildOptions>,
  ): Promise<string> {
    const exportExtension = await this.determineExportExtension(barrelFilePath, buildOptions);

    const newContent = await this.barrelContentBuilder.buildContent(
      entries,
      directoryPath,
      exportExtension,
    );

    if (!buildOptions.hasExistingIndex) {
      return newContent;
    }

    return this.mergeWithSanitizedExistingContent(newContent, barrelFilePath);
  }

  /**
   * Merges new content with sanitized existing barrel content.
   * Preserves direct definitions (functions, types, constants, etc.) while sanitizing re-exports.
   * @param newContent The newly generated content.
   * @param barrelFilePath The path to the existing barrel file.
   * @returns The merged content.
   */
  private async mergeWithSanitizedExistingContent(
    newContent: string,
    barrelFilePath: string,
  ): Promise<string> {
    const existingContent = await this.fileSystemService.readFile(barrelFilePath);
    const newContentPaths = extractAllExportPaths(newContent);

    const { preservedLines } = this.contentSanitizer.preserveDefinitionsAndSanitizeExports(
      existingContent,
      newContentPaths,
    );

    const newContentLines = newContent.trim() ? newContent.trim().split('\n') : [];
    const allLines = [...preservedLines, ...newContentLines];
    const filteredLines = allLines.filter(isNonEmptyTrimmedLine);

    return filteredLines.length > 0 ? filteredLines.join('\n') + '\n' : '\n';
  }

  /**
   * Determines what file extension to use for export statements in barrel files.
   * @param barrelFilePath The path to the barrel file.
   * @param hasExistingIndex Whether an existing index file exists.
   * @returns The extension to use (e.g., '.js' or '').
   */
  private async determineExportExtension(
    barrelFilePath: string,
    buildOptions: Readonly<IBarrelBuildOptions>,
  ): Promise<string> {
    if (!buildOptions.hasExistingIndex) {
      return '.js';
    }

    const existingContent = await this.fileSystemService.readFile(barrelFilePath);
    const extension = detectExtensionFromBarrelContent(existingContent);
    return extension ?? '.js';
  }

  /**
   * Reads directory info for TypeScript files and subdirectories.
   * @param directoryPath Absolute directory path to scan.
   * @returns TypeScript files and immediate subdirectories discovered by the shared file-system service.
   */
  private async readDirectoryInfo(directoryPath: string): Promise<IDirectoryInfo> {
    const [tsFiles, subdirectories] = await Promise.all([
      this.fileSystemService.getTypeScriptFiles(directoryPath),
      this.fileSystemService.getSubdirectories(directoryPath),
    ]);
    return { tsFiles, subdirectories };
  }

  /**
   * Processes child directories recursively if recursive option is enabled.
   * @param subdirectories Array of subdirectory paths.
   * @param options Normalized generation options.
   * @param depth Current recursion depth.
   * @returns Promise that resolves when all child directories have been processed.
   */
  private async processChildDirectories(
    subdirectories: readonly string[],
    options: Readonly<NormalizedGenerationOptions>,
    depth: number,
  ): Promise<void> {
    const maxDepth = 20;
    if (depth >= maxDepth) {
      console.warn(
        `Maximum recursion depth (${maxDepth}) reached at depth ${depth}. Skipping deeper directories.`,
      );
      return;
    }
    if (options.mode !== BarrelGenerationMode.UpdateExisting) {
      await Promise.all(
        subdirectories.map((p) => this.generateBarrelFileFromPath(p, options, depth + 1)),
      );
      return;
    }
    await this.processUpdateExistingDirectories(subdirectories, options, depth);
  }

  /**
   * Processes subdirectories in UpdateExisting mode, only recurse into those with an index file.
   * @param subdirectories Array of subdirectory paths.
   * @param options Normalized generation options.
   * @param depth Current recursion depth.
   * @returns Promise that resolves when processing is complete.
   */
  private async processUpdateExistingDirectories(
    subdirectories: readonly string[],
    options: Readonly<NormalizedGenerationOptions>,
    depth: number,
  ): Promise<void> {
    const filtered = await Promise.all(
      subdirectories.map(async (subdirectoryPath) => {
        const hasIndex = await this.fileSystemService.hasFile(
          path.join(subdirectoryPath, INDEX_FILENAME),
        );
        return hasIndex ? subdirectoryPath : null;
      }),
    );
    await Promise.all(
      filtered
        .filter((p): p is string => p !== null)
        .map((p) => this.generateBarrelFileFromPath(p, options, depth + 1)),
    );
  }

  /**
   * Collects all export entries from TypeScript files and subdirectories.
   * @param directoryPath The directory path being processed.
   * @param tsFiles Array of TypeScript file paths.
   * @param subdirectories Array of subdirectory paths.
   * @returns Promise resolving to a map of relative paths to barrel entries.
   */
  private async collectEntries(
    directoryPath: string,
    tsFiles: readonly string[],
    subdirectories: readonly string[],
  ): Promise<Map<string, BarrelEntry>> {
    const fileEntries = await this.collectFileEntries(directoryPath, tsFiles);
    const subdirectoryEntries = await this.collectSubdirectoryEntries(
      directoryPath,
      subdirectories,
    );
    return new Map([...fileEntries, ...subdirectoryEntries]);
  }

  /**
   * Collects export entries for TypeScript files.
   * @param directoryPath The directory path containing the files.
   * @param tsFiles Array of TypeScript file paths.
   * @returns Relative file paths mapped to their non-empty export entries.
   */
  private async collectFileEntries(
    directoryPath: string,
    tsFiles: readonly string[],
  ): Promise<Map<string, BarrelEntry>> {
    const concurrencyLimit = 10;
    const results = await processConcurrently(tsFiles, concurrencyLimit, (filePath) =>
      this.resolveFileEntry(directoryPath, filePath),
    );
    const entries: Array<readonly [string, BarrelEntry]> = results.flatMap((result) => {
      if (!result) return [];
      const entry: readonly [string, BarrelEntry] = [result.relativePath, result.entry];
      return [entry];
    });
    return new Map(entries);
  }

  /**
   * Resolves the barrel entry for a single TypeScript file.
   * @param directoryPath The directory containing the file.
   * @param filePath The absolute path to the file.
   * @returns Entry metadata or null if the file has no exports.
   */
  private async resolveFileEntry(
    directoryPath: string,
    filePath: string,
  ): Promise<{ relativePath: string; entry: BarrelEntry } | null> {
    try {
      const parsedExports = await this.exportCache.resolveExports(filePath);
      const exports = this.normalizeParsedExports(parsedExports);
      if (exports.length === 0) return null;
      const relativePath = path.relative(directoryPath, filePath);
      return { relativePath, entry: { kind: BarrelEntryKind.File, exports } };
    } catch (error) {
      console.warn(`Failed to process file ${filePath}:`, error);
      return null;
    }
  }

  /**
   * Collects export entries for subdirectories that already expose an index file.
   * @param directoryPath The directory path containing the subdirectories.
   * @param subdirectories Array of subdirectory paths.
   * @returns Relative directory paths mapped to directory export entries.
   */
  private async collectSubdirectoryEntries(
    directoryPath: string,
    subdirectories: readonly string[],
  ): Promise<Map<string, BarrelEntry>> {
    const results = await Promise.all(
      subdirectories.map(async (subdirectoryPath) => {
        const barrelPath = path.join(subdirectoryPath, INDEX_FILENAME);
        const hasBarrel = await this.fileSystemService.hasFile(barrelPath);
        return hasBarrel ? subdirectoryPath : null;
      }),
    );
    const entries: Array<readonly [string, BarrelEntry]> = results.flatMap((subdirectoryPath) => {
      if (!subdirectoryPath) return [];
      const entry: BarrelEntry = { kind: BarrelEntryKind.Directory };
      const relativeEntry: readonly [string, BarrelEntry] = [
        path.relative(directoryPath, subdirectoryPath),
        entry,
      ];
      return [relativeEntry];
    });
    return new Map(entries);
  }

  /**
   * Determines whether a barrel file should be written based on entries and options.
   * @param entries The collected export entries.
   * @param options Normalized generation options.
   * @param hasExistingIndex Whether an index file already exists.
   * @returns True if the barrel file should be written; otherwise false.
   */
  private shouldWriteBarrel(
    entries: ReadonlyMap<string, BarrelEntry>,
    options: Readonly<NormalizedGenerationOptions>,
    buildOptions: Readonly<IBarrelBuildOptions>,
  ): boolean {
    if (entries.size > 0) {
      return true;
    }

    if (options.mode !== BarrelGenerationMode.UpdateExisting) {
      this.throwIfNoFilesAndNotRecursive(options);
      return buildOptions.hasExistingIndex;
    }

    return buildOptions.hasExistingIndex;
  }

  /**
   * Throws an error if no files are found and recursive mode is not enabled.
   * @param options Normalized generation options.
   * @throws Error if no TypeScript files are found in non-recursive mode.
   */
  private throwIfNoFilesAndNotRecursive(options: Readonly<NormalizedGenerationOptions>): void {
    if (!options.recursive) {
      throw new Error('No TypeScript files found in the selected directory');
    }
  }

  /**
   * Normalizes generation options with default values.
   * @param options Optional generation options.
   * @returns Normalized generation options with defaults applied.
   */
  private normalizeOptions(
    options?: Readonly<IBarrelGenerationOptions>,
  ): NormalizedGenerationOptions {
    return {
      recursive: options?.recursive ?? false,
      mode: options?.mode ?? BarrelGenerationMode.CreateOrUpdate,
    };
  }

  /**
   * Normalizes parsed exports into BarrelExport objects.
   * @param exports Array of parsed exports.
   * @returns Array of normalized BarrelExport objects.
   */
  private normalizeParsedExports(exports: readonly IParsedExport[]): BarrelExport[] {
    return exports.map((exp) => {
      if (exp.name === DEFAULT_EXPORT_NAME) {
        return { kind: BarrelExportKind.Default };
      }
      if (exp.name === STAR_EXPORT_NAME) {
        return { kind: BarrelExportKind.Star, typeOnly: exp.typeOnly };
      }

      const entry: BarrelExport = exp.typeOnly
        ? { kind: BarrelExportKind.Type, name: exp.name }
        : { kind: BarrelExportKind.Value, name: exp.name };

      return entry;
    });
  }
}
