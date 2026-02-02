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

    const barrelContent = await this.buildBarrelContent(
      directoryPath,
      entries,
      barrelFilePath,
      hasExistingIndex,
      options,
      tsFiles,
      subdirectories,
    );
    await this.fileSystemService.writeFile(barrelFilePath, barrelContent);
  }

  /**
   * Builds the final barrel content, including sanitization of existing content when updating.
   * @param directoryPath The directory path.
   * @param entries The collected entries.
   * @param barrelFilePath The path to the barrel file.
   * @param hasExistingIndex Whether an existing index file exists.
   * @param options The generation options.
   * @param tsFiles The valid TypeScript files.
   * @param subdirectories The valid subdirectories.
   * @returns The final barrel content.
   */
  private async buildBarrelContent(
    directoryPath: string,
    entries: Map<string, BarrelEntry>,
    barrelFilePath: string,
    hasExistingIndex: boolean,
    options: NormalizedGenerationOptions,
    tsFiles: string[],
    subdirectories: string[],
  ): Promise<string> {
    // Determine what extension to use for exports
    const exportExtension = await this.determineExportExtension(barrelFilePath, hasExistingIndex);

    const newContent = await this.barrelContentBuilder.buildContent(
      entries,
      directoryPath,
      exportExtension,
    );

    if (!hasExistingIndex || options.mode !== BarrelGenerationMode.UpdateExisting) {
      return newContent;
    }

    return this.mergeWithSanitizedExistingContent(
      newContent,
      barrelFilePath,
      directoryPath,
      tsFiles,
      subdirectories,
    );
  }

  /**
   * Merges new content with sanitized existing barrel content.
   * @param newContent The newly generated content.
   * @param barrelFilePath The path to the existing barrel file.
   * @param directoryPath The directory path.
   * @param tsFiles The valid TypeScript files.
   * @param subdirectories The valid subdirectories.
   * @returns The merged content.
   */
  private async mergeWithSanitizedExistingContent(
    newContent: string,
    barrelFilePath: string,
    directoryPath: string,
    tsFiles: string[],
    subdirectories: string[],
  ): Promise<string> {
    const existingContent = await this.fileSystemService.readFile(barrelFilePath);
    const sanitizedExistingExports = this.sanitizeExistingBarrelContent(
      existingContent,
      directoryPath,
      tsFiles,
      subdirectories,
    );

    if (sanitizedExistingExports.length === 0) {
      return newContent;
    }

    const existingContentLines = sanitizedExistingExports.map((exp) => `export * from '${exp}';`);
    const newContentLines = newContent.trim() ? newContent.trim().split('\n') : [];
    const allLines = [...existingContentLines, ...newContentLines];
    return allLines.length > 0 ? allLines.join('\n') + '\n' : '\n';
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
    if (hasExistingIndex) {
      // Check existing barrel file to see what extension pattern it uses
      const existingContent = await this.fileSystemService.readFile(barrelFilePath);
      const extension = this.detectExtensionFromBarrelContent(existingContent);
      if (extension) {
        return extension;
      }
    }

    // Default to .js for ES modules (common in TypeScript projects)
    return '.js';
  }

  /**
   * Detects the file extension pattern used in existing barrel content.
   * @param content The barrel file content.
   * @returns The extension pattern used, or null if none detected.
   */
  private detectExtensionFromBarrelContent(content: string): string | null {
    const lines = content.trim().split('\n');

    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!this.isExportLine(trimmedLine)) {
        continue;
      }

      const extension = this.extractExtensionFromLine(trimmedLine);
      if (extension !== null) {
        return extension;
      }
    }

    return null;
  }

  /**
   * Checks if a line is an export statement.
   * @param line The line to check.
   * @returns True if the line is an export statement.
   */
  private isExportLine(line: string): boolean {
    return line.startsWith("export * from '") || line.startsWith('export {');
  }

  /**
   * Extracts the extension pattern from an export line.
   * @param line The export line.
   * @returns The extension pattern, or null if none found.
   */
  private extractExtensionFromLine(line: string): string | null {
    if (line.includes('.js')) {
      return '.js';
    }

    if (line.includes('.mjs')) {
      return '.mjs';
    }

    // If we find exports without extensions, return empty string
    if (/from '[^']*'(\s*;|$)/.exec(line)) {
      return '';
    }

    return null;
  }
  /**
   *
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

      // Skip files with no exports
      if (exports.length === 0) {
        continue;
      }

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
   * Sanitizes existing barrel content by removing exports to files that should be excluded.
   * @param existingContent The existing barrel file content.
   * @param directoryPath The directory path containing the barrel file.
   * @param validTsFiles Array of valid TypeScript file paths in the directory.
   * @param validSubdirectories Array of valid subdirectory paths.
   * @returns Array of relative paths that should still be exported.
   */
  private sanitizeExistingBarrelContent(
    existingContent: string,
    directoryPath: string,
    validTsFiles: string[],
    validSubdirectories: string[],
  ): string[] {
    const lines = existingContent.trim().split('\n');
    const validExports: string[] = [];

    for (const line of lines) {
      const exportPath = this.extractExportPath(line);
      if (
        exportPath &&
        this.isValidExportPath(exportPath, directoryPath, validTsFiles, validSubdirectories)
      ) {
        validExports.push(exportPath);
      }
    }

    return validExports;
  }

  /**
   * Extracts the export path from a barrel export line.
   * @param line The line to parse.
   * @returns The export path if found, otherwise null.
   */
  private extractExportPath(line: string): string | null {
    const trimmedLine = line.trim();
    if (!trimmedLine?.startsWith("export * from '")) {
      return null;
    }

    const match = /^export \* from '([^']+)';?$/.exec(trimmedLine);
    return match ? match[1] : null;
  }

  /**
   * Checks if an export path is still valid (not pointing to excluded files).
   * @param exportPath The relative export path from the barrel file.
   * @param directoryPath The directory containing the barrel file.
   * @param validTsFiles Array of valid TypeScript file paths.
   * @param validSubdirectories Array of valid subdirectory paths.
   * @returns True if the export should be kept; otherwise, false.
   */
  private isValidExportPath(
    exportPath: string,
    directoryPath: string,
    validTsFiles: string[],
    validSubdirectories: string[],
  ): boolean {
    // Convert relative export path to absolute path
    const absolutePath = path.resolve(directoryPath, exportPath);

    // Check if it's a valid TypeScript file
    const relativeTsPath = path.relative(directoryPath, absolutePath + '.ts');
    const relativeTsxPath = path.relative(directoryPath, absolutePath + '.tsx');

    if (validTsFiles.includes(relativeTsPath) || validTsFiles.includes(relativeTsxPath)) {
      return true;
    }

    // Check if it's a valid subdirectory with index.ts
    if (validSubdirectories.includes(absolutePath)) {
      // Additional check: ensure the subdirectory actually has an index file
      // This is a simplified check - in practice we'd need to verify the file exists
      return true;
    }

    return false;
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
