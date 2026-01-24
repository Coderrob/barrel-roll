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
  type NormalizedBarrelGenerationOptions,
} from '../../types/index.js';
import { FileSystemService } from '../io/file-system.service.js';
import { ExportParser } from '../parser/export.parser.js';
import { BarrelContentBuilder } from './barrel-content.builder.js';

type NormalizedGenerationOptions = NormalizedBarrelGenerationOptions;

/**
 * Service to generate or update a barrel (index.ts) file in a directory.
 */
export class BarrelFileGenerator {
  private readonly barrelContentBuilder: BarrelContentBuilder;
  private readonly exportParser: ExportParser;
  private readonly fileSystemService: FileSystemService;

  /**
   * Creates a new BarrelFileGenerator instance.
   * @param fileSystemService Optional file system service instance.
   * @param exportParser Optional export parser instance.
   * @param barrelContentBuilder Optional barrel content builder instance.
   */
  constructor(
    fileSystemService?: FileSystemService,
    exportParser?: ExportParser,
    barrelContentBuilder?: BarrelContentBuilder,
  ) {
    this.barrelContentBuilder = barrelContentBuilder || new BarrelContentBuilder();
    this.exportParser = exportParser || new ExportParser();
    this.fileSystemService = fileSystemService || new FileSystemService();
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
   * @returns Promise that resolves when the barrel file has been created/updated.
   */
  private async generateBarrelFileFromPath(
    directoryPath: string,
    options: NormalizedGenerationOptions,
  ): Promise<void> {
    const barrelFilePath = path.join(directoryPath, INDEX_FILENAME);
    const { tsFiles, subdirectories } = await this.readDirectoryInfo(directoryPath);

    if (options.recursive) {
      await this.processChildDirectories(subdirectories, options);
    }

    const entries = await this.collectEntries(directoryPath, tsFiles, subdirectories);

    const hasExistingIndex = await this.fileSystemService.fileExists(barrelFilePath);
    if (!this.shouldWriteBarrel(entries, options, hasExistingIndex)) {
      return;
    }

    const barrelContent = this.barrelContentBuilder.buildContent(entries, directoryPath);
    await this.fileSystemService.writeFile(barrelFilePath, barrelContent);
  }

  /**
   * Reads directory information including TypeScript files and subdirectories.
   * @param directoryPath The directory path to read.
   * @returns Promise resolving to an object containing arrays of TypeScript files and subdirectories.
   */
  private async readDirectoryInfo(directoryPath: string): Promise<{
    tsFiles: string[];
    subdirectories: string[];
  }> {
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
   * @returns Promise that resolves when all child directories have been processed.
   */
  private async processChildDirectories(
    subdirectories: string[],
    options: NormalizedGenerationOptions,
  ): Promise<void> {
    for (const subdirectoryPath of subdirectories) {
      if (options.mode === BarrelGenerationMode.UpdateExisting) {
        const hasIndex = await this.fileSystemService.fileExists(
          path.join(subdirectoryPath, INDEX_FILENAME),
        );
        if (!hasIndex) {
          continue;
        }
      }

      await this.generateBarrelFileFromPath(subdirectoryPath, options);
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
    for (const filePath of tsFiles) {
      const content = await this.fileSystemService.readFile(filePath);
      const parsedExports = this.exportParser.extractExports(content);
      const exports = this.normalizeParsedExports(parsedExports);

      const relativePath = path.relative(directoryPath, filePath);
      entries.set(relativePath, { kind: BarrelEntryKind.File, exports });
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

    if (options.mode === BarrelGenerationMode.UpdateExisting) {
      return hasExistingIndex;
    }

    this.throwIfNoFilesAndNotRecursive(options);
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
   * Normalizes parsed exports to BarrelExport objects.
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
