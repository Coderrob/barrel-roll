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

import { NEWLINE } from '../../types/constants.js';
import {
  type BarrelEntry,
  BarrelEntryKind,
  BarrelExport,
  BarrelExportKind,
  DEFAULT_EXPORT_NAME,
  PARENT_DIRECTORY_SEGMENT,
} from '../../types/index.js';
import { sortAlphabetically } from '../../utils/string.js';
import { FileSystemService } from '../io/file-system.service.js';

/**
 * Service to build the content of a barrel file from exports.
 */
export class BarrelContentBuilder {
  private readonly fileSystemService: FileSystemService;

  /**
   * Creates a new BarrelContentBuilder instance.
   * @param fileSystemService Optional file system service instance.
   */
  constructor(fileSystemService?: FileSystemService) {
    this.fileSystemService = fileSystemService || new FileSystemService();
  }
  /**
   * Builds the content of a barrel file from export entries.
   * @param entries Map of file paths to export arrays.
   * @param directoryPath The directory path for relative imports.
   * @param exportExtension The file extension to use for exports (e.g., '.js' or '').
   * @returns The barrel file content as a string.
   */
  buildContent(
    entries: Map<string, string[]>,
    directoryPath: string,
    exportExtension?: string,
  ): Promise<string>;
  /**
   * Builds the content of a barrel file from export entries.
   * @param entries Map of file paths to barrel entries.
   * @param directoryPath The directory path for relative imports.
   * @param exportExtension The file extension to use for exports (e.g., '.js' or '').
   * @returns The barrel file content as a string.
   */
  buildContent(
    entries: Map<string, BarrelEntry>,
    directoryPath: string,
    exportExtension?: string,
  ): Promise<string>;
  /**
   * Builds the content of a barrel file from export entries.
   * @param entries Map of file paths to barrel entries or export arrays.
   * @param directoryPath The directory path for relative imports.
   * @param exportExtension The file extension to use for exports (e.g., '.js' or '').
   * @returns The barrel file content as a string.
   */
  async buildContent(
    entries: Map<string, BarrelEntry | string[]>,
    directoryPath: string,
    exportExtension = '',
  ): Promise<string> {
    const lines: string[] = [];
    const normalizedEntries = this.normalizeEntries(entries);

    // Sort files alphabetically for consistent output
    const sortedPaths = sortAlphabetically(normalizedEntries.keys());

    for (const relativePath of sortedPaths) {
      const entry = normalizedEntries.get(relativePath);
      if (!entry) {
        continue;
      }

      const exportLines = await this.createLinesForEntry(
        relativePath,
        entry,
        exportExtension,
        directoryPath,
      );
      if (exportLines.length === 0) {
        continue;
      }

      lines.push(...exportLines);
    }

    // Add newline at end of file
    return lines.join(NEWLINE) + NEWLINE;
  }

  /**
   * Normalizes mixed entry maps to barrel entries.
   * @param entries Source entries (string[] or BarrelEntry)
   * @returns Map of BarrelEntry
   */
  private normalizeEntries(entries: Map<string, BarrelEntry | string[]>): Map<string, BarrelEntry> {
    const normalized = new Map<string, BarrelEntry>();

    for (const [relativePath, entry] of entries) {
      if (Array.isArray(entry)) {
        normalized.set(relativePath, {
          kind: BarrelEntryKind.File,
          exports: entry.map((name) => this.toLegacyExport(name)),
        });
      } else {
        normalized.set(relativePath, entry);
      }
    }

    return normalized;
  }

  /**
   * Converts a legacy export name to a BarrelExport object.
   * @param name The export name.
   * @returns The corresponding BarrelExport object.
   */
  private toLegacyExport(name: string): BarrelExport {
    if (name === DEFAULT_EXPORT_NAME) {
      return { kind: BarrelExportKind.Default };
    }

    return { kind: BarrelExportKind.Value, name };
  }

  /**
   * Creates export lines for a given entry.
   * @param relativePath The entry path
   * @param entry The entry metadata
   * @param exportExtension The file extension to use for exports
   * @param directoryPath The directory path for resolving relative paths
   * @returns export lines for the entry
   */
  private async createLinesForEntry(
    relativePath: string,
    entry: BarrelEntry,
    exportExtension: string,
    directoryPath: string,
  ): Promise<string[]> {
    if (entry.kind === BarrelEntryKind.Directory) {
      return this.buildDirectoryExportLines(relativePath, exportExtension, directoryPath);
    }

    return this.buildFileExportLines(relativePath, entry.exports, exportExtension, directoryPath);
  }

  /**
   * Builds export statement(s) for a directory entry.
   * @param relativePath The directory path
   * @param exportExtension The file extension to use for exports
   * @param directoryPath The directory path for resolving relative paths
   * @returns The export statement(s)
   */
  private async buildDirectoryExportLines(
    relativePath: string,
    exportExtension: string,
    directoryPath: string,
  ): Promise<string[]> {
    const modulePath = await this.getModulePath(relativePath, exportExtension, directoryPath);
    if (modulePath.startsWith(PARENT_DIRECTORY_SEGMENT)) {
      return [];
    }
    return [`export * from './${modulePath}';`];
  }

  /**
   * Builds export statement(s) for a file and its exports.
   * @param filePath The file path
   * @param exports The exports from the file
   * @param exportExtension The file extension to use for exports
   * @param directoryPath The directory path for resolving relative paths
   * @returns The export statement(s)
   */
  private async buildFileExportLines(
    filePath: string,
    exports: BarrelExport[],
    exportExtension: string,
    directoryPath: string,
  ): Promise<string[]> {
    const cleanedExports = exports.filter((exp) =>
      exp.kind === BarrelExportKind.Default ? true : !exp.name.includes(PARENT_DIRECTORY_SEGMENT),
    );

    // Skip files with no exports
    if (cleanedExports.length === 0) {
      return [];
    }

    // Convert file path to module path (remove .ts extension and normalize)
    const modulePath = await this.getModulePath(filePath, exportExtension, directoryPath);

    // Skip if this references a parent folder
    if (modulePath.startsWith(PARENT_DIRECTORY_SEGMENT)) {
      return [];
    }

    return this.generateExportStatements(modulePath, cleanedExports);
  }

  /**
   * Generates export statement(s) based on the type of exports.
   * Uses TypeScript 4.5+ mixed export syntax to combine value and type exports
   * in a single statement when both are present.
   * @param modulePath The module path
   * @param exports The exports
   * @returns The export statement(s)
   */
  // eslint-disable-next-line complexity -- Acceptable complexity for export combination logic
  private generateExportStatements(modulePath: string, exports: BarrelExport[]): string[] {
    const lines: string[] = [];

    const valueNames = this.getExportNames(exports, BarrelExportKind.Value);
    const typeNames = this.getExportNames(exports, BarrelExportKind.Type);
    const hasDefault = exports.some((exp) => exp.kind === BarrelExportKind.Default);

    // If we have both values and types, combine them using TypeScript 4.5+ syntax
    if (valueNames.length > 0 && typeNames.length > 0) {
      const combinedExports = [...valueNames, ...typeNames.map((name) => `type ${name}`)].join(
        ', ',
      );
      lines.push(`export { ${combinedExports} } from './${modulePath}';`);
    } else if (valueNames.length > 0) {
      lines.push(`export { ${valueNames.join(', ')} } from './${modulePath}';`);
    } else if (typeNames.length > 0) {
      lines.push(`export type { ${typeNames.join(', ')} } from './${modulePath}';`);
    }

    if (hasDefault) {
      lines.push(`export { default } from './${modulePath}';`);
    }

    return lines;
  }

  /**
   * Extracts and sorts export names of a specific kind.
   */
  private getExportNames(
    exports: BarrelExport[],
    kind: BarrelExportKind.Value | BarrelExportKind.Type,
  ): string[] {
    return sortAlphabetically(
      exports
        .filter((exp): exp is BarrelExport & { name: string } => exp.kind === kind && 'name' in exp)
        .map((exp) => exp.name),
    );
  }

  /**
   * Converts a file path to a module path with the appropriate extension.
   * @param filePath The file path
   * @param exportExtension The extension to use for exports (e.g., '.js' or '')
   * @param directoryPath The directory path for resolving relative paths
   * @returns The module path
   */
  private async getModulePath(
    filePath: string,
    exportExtension: string,
    directoryPath: string,
  ): Promise<string> {
    const isDirectory = await this.isDirectory(filePath, directoryPath);
    // For directories, append /index + extension if extension is specified
    if (isDirectory) {
      return exportExtension ? `${filePath}/index${exportExtension}` : filePath;
    }

    // For files, remove .ts/.tsx extension and replace with the desired export extension
    const modulePath = filePath.replace(/\.tsx?$/, '') + exportExtension;
    // Normalize path separators for cross-platform compatibility
    return modulePath.replaceAll('\\', '/');
  }

  /**
   * Checks if a file path represents a directory.
   * @param filePath The file path to check
   * @param directoryPath The directory path for resolving relative paths
   * @returns True if the path represents a directory
   */
  private async isDirectory(filePath: string, directoryPath: string): Promise<boolean> {
    // For test compatibility, if directoryPath is empty, assume directories based on file extension
    if (!directoryPath) {
      return !/\.tsx?$/.test(filePath);
    }

    // Resolve the full path to check if it's a directory
    const fullPath = path.resolve(directoryPath, filePath);

    return this.fileSystemService.isDirectory(fullPath);
  }
}
