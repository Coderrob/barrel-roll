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
 * Converts a legacy export name string to a BarrelExport object.
 * @param name The export name to convert.
 * @returns The corresponding BarrelExport object.
 */
function legacyExportFromName(name: string): BarrelExport {
  if (name === DEFAULT_EXPORT_NAME) {
    return { kind: BarrelExportKind.Default };
  }
  return { kind: BarrelExportKind.Value, name };
}

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
    const normalizedEntries = this.normalizeEntries(entries);
    const lines = await this.collectAllExportLines(
      normalizedEntries,
      exportExtension,
      directoryPath,
    );
    return lines.join(NEWLINE) + NEWLINE;
  }

  /**
   * Collects all export lines from the normalized entry map using parallel resolution.
   * @param normalizedEntries Map of relative paths to barrel entries.
   * @param exportExtension The file extension to use for exports.
   * @param directoryPath The directory path for relative imports.
   * @returns Flattened array of all export lines.
   */
  private async collectAllExportLines(
    normalizedEntries: Map<string, BarrelEntry>,
    exportExtension: string,
    directoryPath: string,
  ): Promise<string[]> {
    const sortedPaths = sortAlphabetically(normalizedEntries.keys());
    const promises: Promise<string[]>[] = [];
    for (const relativePath of sortedPaths) {
      const entry = normalizedEntries.get(relativePath);
      if (entry) {
        promises.push(
          this.createLinesForEntry(relativePath, entry, exportExtension, directoryPath),
        );
      }
    }
    const lineGroups = await Promise.all(promises);
    return lineGroups.flat();
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
          exports: entry.map(legacyExportFromName),
        });
      } else {
        normalized.set(relativePath, entry);
      }
    }

    return normalized;
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
   * Determines whether an export should be retained (not a parent-directory reference).
   * @param exp The barrel export to check.
   * @returns True if the export should be kept.
   */
  private isRelevantExport(exp: BarrelExport): boolean {
    return exp.kind === BarrelExportKind.Default
      ? true
      : !exp.name.includes(PARENT_DIRECTORY_SEGMENT);
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
    const cleanedExports = exports.filter(this.isRelevantExport.bind(this));

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
  private generateExportStatements(modulePath: string, exports: BarrelExport[]): string[] {
    const lines: string[] = [];

    const valueNames = this.getExportNames(exports, BarrelExportKind.Value);
    const typeNames = this.getExportNames(exports, BarrelExportKind.Type);
    const namedLine = this.buildNamedExportLine(modulePath, valueNames, typeNames);

    if (namedLine) {
      lines.push(namedLine);
    }

    if (exports.some(this.isDefaultKindExport.bind(this))) {
      lines.push(`export { default } from './${modulePath}';`);
    }

    return lines;
  }

  /**
   * Checks whether a barrel export is a default export.
   * @param exp The barrel export to check.
   * @returns True if the export kind is Default.
   */
  private isDefaultKindExport(exp: BarrelExport): boolean {
    return exp.kind === BarrelExportKind.Default;
  }

  /**
   * Prefixes an export name with 'type ' for mixed export syntax.
   * @param name The export name to prefix.
   * @returns The name with a 'type ' prefix.
   */
  private toTypeExportName(name: string): string {
    return `type ${name}`;
  }

  /**
   * Builds a combined or single named export line for the given module.
   * Returns null when there are no value or type names to export.
   * @param modulePath The module path for the export statement.
   * @param valueNames The value export names.
   * @param typeNames The type export names.
   * @returns An export line string, or null if nothing to export.
   */
  private buildNamedExportLine(
    modulePath: string,
    valueNames: string[],
    typeNames: string[],
  ): string | null {
    if (valueNames.length > 0 && typeNames.length > 0) {
      const combined = [...valueNames, ...typeNames.map(this.toTypeExportName.bind(this))].join(
        ', ',
      );
      return `export { ${combined} } from './${modulePath}';`;
    }
    if (valueNames.length > 0) {
      return `export { ${valueNames.join(', ')} } from './${modulePath}';`;
    }
    if (typeNames.length > 0) {
      return `export type { ${typeNames.join(', ')} } from './${modulePath}';`;
    }
    return null;
  }

  /**
   * Extracts and sorts export names of a specific kind.
   * @param exports TODO: describe parameter
   * @param kind TODO: describe parameter
   * @returns TODO: describe return value
   */
  private getExportNames(
    exports: BarrelExport[],
    kind: BarrelExportKind.Value | BarrelExportKind.Type,
  ): string[] {
    /**
     * Checks whether an export has the given kind and a name property.
     * @param exp - The barrel export to check.
     * @returns True if the export matches the kind and has a name.
     */
    const matchesKind = (exp: BarrelExport): exp is BarrelExport & { name: string } =>
      exp.kind === kind && 'name' in exp;
    /**
     * Extracts the name from a named barrel export.
     * @param exp - The named barrel export.
     * @returns The export name string.
     */
    const getName = (exp: BarrelExport & { name: string }): string => exp.name;
    return sortAlphabetically(exports.filter(matchesKind).map(getName));
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
    return modulePath.replaceAll(/\\/g, '/');
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
