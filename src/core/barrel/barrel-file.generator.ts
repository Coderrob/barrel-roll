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
  INDEX_FILENAME,
  type IParsedExport,
  type LoggerInstance,
  type NormalizedBarrelGenerationOptions,
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
interface DirectoryInfo {
  tsFiles: string[];
  subdirectories: string[];
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
    logger?: LoggerInstance,
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
  async generateBarrelFile(directoryUri: Uri, options?: IBarrelGenerationOptions): Promise<void> {
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
    options: NormalizedGenerationOptions,
    depth = 0,
  ): Promise<void> {
    const barrelFilePath = path.join(directoryPath, INDEX_FILENAME);
    const { tsFiles, subdirectories } = await this.readDirectoryInfo(directoryPath);

    if (options.recursive) {
      await this.processChildDirectories(subdirectories, options, depth);
    }

    const entries = await this.collectEntries(directoryPath, tsFiles, subdirectories);

    const hasExistingIndex = await this.fileSystemService.fileExists(barrelFilePath);
    if (!this.shouldWriteBarrel(entries, options, hasExistingIndex)) {
      return;
    }

    const barrelContent = await this.buildBarrelContent(
      directoryPath,
      entries,
      barrelFilePath,
      hasExistingIndex,
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
    entries: Map<string, BarrelEntry>,
    barrelFilePath: string,
    hasExistingIndex: boolean,
  ): Promise<string> {
    const exportExtension = await this.determineExportExtension(barrelFilePath, hasExistingIndex);

    const newContent = await this.barrelContentBuilder.buildContent(
      entries,
      directoryPath,
      exportExtension,
    );

    if (!hasExistingIndex) {
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
    const filteredLines = allLines.filter((line) => line.trim().length > 0);

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
    hasExistingIndex: boolean,
  ): Promise<string> {
    if (!hasExistingIndex) {
      return '.js';
    }

    const existingContent = await this.fileSystemService.readFile(barrelFilePath);
    const extension = detectExtensionFromBarrelContent(existingContent);
    return extension ?? '.js';
  }

  /**
   * Reads directory info for TypeScript files and subdirectories.
   */
  private async readDirectoryInfo(directoryPath: string): Promise<DirectoryInfo> {
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
    subdirectories: string[],
    options: NormalizedGenerationOptions,
    depth: number,
  ): Promise<void> {
    const maxDepth = 20;

    if (depth >= maxDepth) {
      console.warn(
        `Maximum recursion depth (${maxDepth}) reached at depth ${depth}. Skipping deeper directories.`,
      );
      return;
    }

    for (const subdirectoryPath of subdirectories) {
      if (options.mode !== BarrelGenerationMode.UpdateExisting) {
        await this.generateBarrelFileFromPath(subdirectoryPath, options, depth + 1);
        continue;
      }

      const hasIndex = await this.fileSystemService.fileExists(
        path.join(subdirectoryPath, INDEX_FILENAME),
      );
      if (!hasIndex) {
        continue;
      }

      await this.generateBarrelFileFromPath(subdirectoryPath, options, depth + 1);
    }
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
    tsFiles: string[],
    subdirectories: string[],
  ): Promise<Map<string, BarrelEntry>> {
    const entries = new Map<string, BarrelEntry>();

    await this.addFileEntries(directoryPath, tsFiles, entries);
    await this.addSubdirectoryEntries(directoryPath, subdirectories, entries);

    return entries;
  }

  /**
   * Adds export entries for TypeScript files to the entries map.
   * @param directoryPath The directory path containing the files.
   * @param tsFiles Array of TypeScript file paths.
   * @param entries The map to add entries to.
   * @returns Promise that resolves when all file entries have been added.
   */
  private async addFileEntries(
    directoryPath: string,
    tsFiles: string[],
    entries: Map<string, BarrelEntry>,
  ): Promise<void> {
    const concurrencyLimit = 10;
    const batchSize = 50;

    for (let i = 0; i < tsFiles.length; i += batchSize) {
      const batch = tsFiles.slice(i, i + batchSize);
      const results = await processConcurrently(batch, concurrencyLimit, async (filePath) => {
        try {
          const parsedExports = await this.exportCache.getExports(filePath);
          const exports = this.normalizeParsedExports(parsedExports);

          if (exports.length === 0) {
            return null;
          }

          const relativePath = path.relative(directoryPath, filePath);
          return { relativePath, entry: { kind: BarrelEntryKind.File, exports } };
        } catch (error) {
          console.warn(`Failed to process file ${filePath}:`, error);
          return null;
        }
      });

      for (const result of results) {
        if (!result) {
          continue;
        }

        entries.set(result.relativePath, result.entry);
      }
    }
  }

  /**
   * Adds export entries for subdirectories that have index files to the entries map.
   * @param directoryPath The directory path containing the subdirectories.
   * @param subdirectories Array of subdirectory paths.
   * @param entries The map to add entries to.
   * @returns Promise that resolves when all subdirectory entries have been added.
   */
  private async addSubdirectoryEntries(
    directoryPath: string,
    subdirectories: string[],
    entries: Map<string, BarrelEntry>,
  ): Promise<void> {
    for (const subdirectoryPath of subdirectories) {
      const barrelPath = path.join(subdirectoryPath, INDEX_FILENAME);
      if (!(await this.fileSystemService.fileExists(barrelPath))) {
        continue;
      }

      const relativePath = path.relative(directoryPath, subdirectoryPath);
      entries.set(relativePath, { kind: BarrelEntryKind.Directory });
    }
  }

  /**
   * Determines whether a barrel file should be written based on entries and options.
   * @param entries The collected export entries.
   * @param options Normalized generation options.
   * @param hasExistingIndex Whether an index file already exists.
   * @returns True if the barrel file should be written; otherwise false.
   */
  private shouldWriteBarrel(
    entries: Map<string, BarrelEntry>,
    options: NormalizedGenerationOptions,
    hasExistingIndex: boolean,
  ): boolean {
    if (entries.size > 0) {
      return true;
    }

    if (options.mode !== BarrelGenerationMode.UpdateExisting) {
      this.throwIfNoFilesAndNotRecursive(options);
      return hasExistingIndex;
    }

    return hasExistingIndex;
  }

  /**
   * Throws an error if no files are found and recursive mode is not enabled.
   * @param options Normalized generation options.
   * @throws Error if no TypeScript files are found in non-recursive mode.
   */
  private throwIfNoFilesAndNotRecursive(options: NormalizedGenerationOptions): void {
    if (!options.recursive) {
      throw new Error('No TypeScript files found in the selected directory');
    }
  }

  /**
   * Normalizes generation options with default values.
   * @param options Optional generation options.
   * @returns Normalized generation options with defaults applied.
   */
  private normalizeOptions(options?: IBarrelGenerationOptions): NormalizedGenerationOptions {
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
  private normalizeParsedExports(exports: IParsedExport[]): BarrelExport[] {
    return exports.map((exp) => {
      if (exp.name === DEFAULT_EXPORT_NAME) {
        return { kind: BarrelExportKind.Default };
      }

      const entry: BarrelExport = exp.typeOnly
        ? { kind: BarrelExportKind.Type, name: exp.name }
        : { kind: BarrelExportKind.Value, name: exp.name };

      return entry;
    });
  }
}
