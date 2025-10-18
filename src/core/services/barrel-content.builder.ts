const DEFAULT_KEYWORD = 'default';
const NEWLINE = '\n';
const PARENT_DIRECTORY = '..';

export type BarrelEntry =
  | {
      kind: 'file';
      exports: string[];
    }
  | {
      kind: 'directory';
    };

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
    const sortedPaths = Array.from(normalizedEntries.keys()).sort();

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
        normalized.set(relativePath, { kind: 'file', exports: entry });
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
   * @returns export lines for the entry
   */
  private createLinesForEntry(relativePath: string, entry: BarrelEntry): string[] {
    if (entry.kind === 'directory') {
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
    if (modulePath.startsWith(PARENT_DIRECTORY)) {
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
  private buildFileExportLines(filePath: string, exports: string[]): string[] {
    // Filter out exports that reference parent folders (shouldn't happen at this stage but defensive)
    const cleanedExports = exports.filter((exp) => !exp.includes(PARENT_DIRECTORY));

    if (cleanedExports.length === 0) {
      return [];
    }

    // Convert file path to module path (remove .ts extension and normalize)
    const modulePath = this.getModulePath(filePath);

    // Skip if this references a parent folder
    if (modulePath.startsWith(PARENT_DIRECTORY)) {
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
  private generateExportStatements(modulePath: string, exports: string[]): string[] {
    const hasDefaultExport = exports.includes(DEFAULT_KEYWORD);
    const hasNamedExports = exports.some((exp) => exp !== DEFAULT_KEYWORD);

    if (hasDefaultExport && !hasNamedExports) {
      // Only default export
      return [`export { default } from './${modulePath}';`];
    }

    const lines: string[] = [];
    if (hasNamedExports) {
      const namedExports = exports.filter((exp) => exp !== DEFAULT_KEYWORD);
      lines.push(`export { ${namedExports.join(', ')} } from './${modulePath}';`);
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
    modulePath = modulePath.replace(/\\/g, '/');
    return modulePath;
  }
}
