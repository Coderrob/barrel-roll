import * as path from 'node:path';

import type { Uri } from 'vscode';

import { BarrelExport } from '@/types/barrel/BarrelExport.js';

import {
  type BarrelEntry,
  BarrelEntryKind,
  BarrelExportKind,
  BarrelGenerationMode,
  type BarrelGenerationOptions,
  DEFAULT_EXPORT_NAME,
  INDEX_FILENAME,
  type NormalizedBarrelGenerationOptions,
  type ParsedExport,
} from '../../types/index.js';
import { isEmptyArray } from '../../utils/array.js';
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
  async generateBarrelFile(directoryUri: Uri, options?: BarrelGenerationOptions): Promise<void> {
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

  private async addFileEntries(
    directoryPath: string,
    tsFiles: string[],
    entries: Map<string, BarrelEntry>,
  ): Promise<void> {
    for (const filePath of tsFiles) {
      const content = await this.fileSystemService.readFile(filePath);
      const parsedExports = this.exportParser.extractExports(content);
      const exports = this.normalizeParsedExports(parsedExports);
      if (isEmptyArray(exports)) {
        continue;
      }

      const relativePath = path.relative(directoryPath, filePath);
      entries.set(relativePath, { kind: BarrelEntryKind.File, exports });
    }
  }

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

    if (!options.recursive) {
      throw new Error('No TypeScript files found in the selected directory');
    }

    return hasExistingIndex;
  }

  private normalizeOptions(options?: BarrelGenerationOptions): NormalizedGenerationOptions {
    return {
      recursive: options?.recursive ?? false,
      mode: options?.mode ?? BarrelGenerationMode.CreateOrUpdate,
    };
  }

  private normalizeParsedExports(exports: ParsedExport[]): BarrelExport[] {
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
