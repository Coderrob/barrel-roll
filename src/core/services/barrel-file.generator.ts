import * as path from 'path';

import type { Uri } from 'vscode';

import { BarrelContentBuilder, BarrelEntry } from './barrel-content.builder';
import { ExportParser } from './export.parser';
import { FileSystemService } from './file-system.service';

const INDEX_FILE_NAME = 'index.ts';

export type BarrelGenerationMode = 'createOrUpdate' | 'updateExisting';

export interface BarrelGenerationOptions {
  recursive?: boolean;
  mode?: BarrelGenerationMode;
}

type NormalizedGenerationOptions = Required<BarrelGenerationOptions>;

/**
 * Service to generate or update a barrel (index.ts) file in a directory.
 */
export class BarrelFileGenerator {
  private fileSystemService: FileSystemService;
  private exportParser: ExportParser;
  private barrelContentBuilder: BarrelContentBuilder;

  constructor(
    fileSystemService?: FileSystemService,
    exportParser?: ExportParser,
    barrelContentBuilder?: BarrelContentBuilder,
  ) {
    this.fileSystemService = fileSystemService || new FileSystemService();
    this.exportParser = exportParser || new ExportParser();
    this.barrelContentBuilder = barrelContentBuilder || new BarrelContentBuilder();
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

  private async generateBarrelFileFromPath(
    directoryPath: string,
    options: NormalizedGenerationOptions,
  ): Promise<void> {
    const barrelFilePath = path.join(directoryPath, INDEX_FILE_NAME);
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
      if (
        options.mode === 'updateExisting' &&
        !(await this.fileSystemService.fileExists(path.join(subdirectoryPath, INDEX_FILE_NAME)))
      ) {
        continue;
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
      const exports = this.exportParser.extractExports(content);
      if (exports.length === 0) {
        continue;
      }

      const relativePath = path.relative(directoryPath, filePath);
      entries.set(relativePath, { kind: 'file', exports });
    }
  }

  private async addSubdirectoryEntries(
    directoryPath: string,
    subdirectories: string[],
    entries: Map<string, BarrelEntry>,
  ): Promise<void> {
    for (const subdirectoryPath of subdirectories) {
      const barrelPath = path.join(subdirectoryPath, INDEX_FILE_NAME);
      if (!(await this.fileSystemService.fileExists(barrelPath))) {
        continue;
      }

      const relativePath = path.relative(directoryPath, subdirectoryPath);
      entries.set(relativePath, { kind: 'directory' });
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

    if (options.mode === 'updateExisting') {
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
      mode: options?.mode ?? 'createOrUpdate',
    };
  }
}
