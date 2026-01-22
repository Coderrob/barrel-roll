import {
  BarrelEntry,
  BarrelEntryKind,
  BarrelExport,
  BarrelExportKind,
  DEFAULT_EXPORT_NAME,
  NEWLINE,
  PARENT_DIRECTORY_SEGMENT,
} from '../../types/index.js';
import { sortAlphabetically } from '../../utils/string.js';

/**
 * Service to build the content of a barrel file from exports.
 */
export class BarrelContentBuilder {
  buildContent(entries: Map<string, string[]>, directoryPath: string): string;
  buildContent(entries: Map<string, BarrelEntry>, directoryPath: string): string;
  buildContent(entries: Map<string, BarrelEntry | string[]>, _directoryPath: string): string {
    const lines: string[] = [];
    const normalizedEntries = this.normalizeEntries(entries);

    // Sort files alphabetically for consistent output
    const sortedPaths = sortAlphabetically(normalizedEntries.keys());

    for (const relativePath of sortedPaths) {
      const entry = normalizedEntries.get(relativePath);
      if (!entry) {
        continue;
      }

      const exportLines = this.createLinesForEntry(relativePath, entry);
      if (exportLines.length > 0) {
        lines.push(...exportLines);
      }
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
   * @returns export lines for the entry
   */
  private createLinesForEntry(relativePath: string, entry: BarrelEntry): string[] {
    if (entry.kind === BarrelEntryKind.Directory) {
      return this.buildDirectoryExportLines(relativePath);
    }

    return this.buildFileExportLines(relativePath, entry.exports);
  }

  /**
   * Builds export statement(s) for a directory entry.
   * @param relativePath The directory path
   * @returns The export statement(s)
   */
  private buildDirectoryExportLines(relativePath: string): string[] {
    const modulePath = this.getModulePath(relativePath);
    // istanbul ignore next
    if (modulePath.startsWith(PARENT_DIRECTORY_SEGMENT)) {
      return [];
    }
    return [`export * from './${modulePath}';`];
  }

  /**
   * Builds export statement(s) for a file and its exports.
   * @param filePath The file path
   * @param exports The exports from the file
   * @returns The export statement(s)
   */
  private buildFileExportLines(filePath: string, exports: BarrelExport[]): string[] {
    const cleanedExports = exports.filter((exp) =>
      exp.kind === BarrelExportKind.Default ? true : !exp.name.includes(PARENT_DIRECTORY_SEGMENT),
    );

    if (cleanedExports.length === 0) {
      return [];
    }

    // Convert file path to module path (remove .ts extension and normalize)
    const modulePath = this.getModulePath(filePath);

    // Skip if this references a parent folder
    // istanbul ignore next
    if (modulePath.startsWith(PARENT_DIRECTORY_SEGMENT)) {
      return [];
    }

    return this.generateExportStatements(modulePath, cleanedExports);
  }

  /**
   * Generates export statement(s) based on the type of exports.
   * @param modulePath The module path
   * @param exports The exports
   * @returns The export statement(s)
   */
  private generateExportStatements(modulePath: string, exports: BarrelExport[]): string[] {
    const lines: string[] = [];

    const valueExports = exports
      .filter(
        (exp): exp is Extract<BarrelExport, { kind: BarrelExportKind.Value }> =>
          exp.kind === BarrelExportKind.Value,
      )
      .map((exp) => exp.name);
    const typeExports = exports
      .filter(
        (exp): exp is Extract<BarrelExport, { kind: BarrelExportKind.Type }> =>
          exp.kind === BarrelExportKind.Type,
      )
      .map((exp) => exp.name);
    const hasDefaultExport = exports.some((exp) => exp.kind === BarrelExportKind.Default);

    if (valueExports.length > 0) {
      lines.push(`export { ${valueExports.join(', ')} } from './${modulePath}';`);
    }

    if (typeExports.length > 0) {
      lines.push(`export type { ${typeExports.join(', ')} } from './${modulePath}';`);
    }

    if (hasDefaultExport) {
      lines.push(`export { default } from './${modulePath}';`);
    }

    return lines;
  }

  /**
   * Converts a file path to a module path (removes .ts extension).
   * @param filePath The file path
   * @returns The module path
   */
  private getModulePath(filePath: string): string {
    // Remove .ts or .tsx extension
    let modulePath = filePath.replace(/\.tsx?$/, '');
    // Normalize path separators for cross-platform compatibility
    modulePath = modulePath.replaceAll('\\', '/');
    return modulePath;
  }
}
