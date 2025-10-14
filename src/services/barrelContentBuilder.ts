import * as path from 'path';

/**
 * Service responsible for building barrel file content.
 * Follows Single Responsibility Principle by handling only content generation.
 */
export class BarrelContentBuilder {
  /**
   * Builds the content for a barrel file from a map of exports.
   * Filters out any re-exports from parent folders.
   *
   * @param exportsByFile Map of file paths to their exports
   * @param directoryPath The directory containing the files
   * @returns The formatted barrel file content
   */
  buildContent(exportsByFile: Map<string, string[]>, directoryPath: string): string {
    const lines: string[] = [];

    // Sort files alphabetically for consistent output
    const sortedFiles = Array.from(exportsByFile.keys()).sort();

    for (const filePath of sortedFiles) {
      const exports = exportsByFile.get(filePath);
      if (!exports || exports.length === 0) {
        continue;
      }

      // Filter out exports that reference parent folders (shouldn't happen at this stage but defensive)
      const cleanedExports = exports.filter((exp) => !exp.includes('..'));

      if (cleanedExports.length === 0) {
        continue;
      }

      // Convert file path to module path (remove .ts extension and normalize)
      const modulePath = this.getModulePath(filePath);

      // Skip if this references a parent folder
      if (modulePath.startsWith('..')) {
        continue;
      }

      // Generate export statement
      if (cleanedExports.includes('default') && cleanedExports.length === 1) {
        // Only default export
        lines.push(`export { default } from './${modulePath}';`);
      } else if (cleanedExports.includes('default')) {
        // Default export and named exports
        const namedExports = cleanedExports.filter((exp) => exp !== 'default');
        lines.push(`export { ${namedExports.join(', ')} } from './${modulePath}';`);
        lines.push(`export { default } from './${modulePath}';`);
      } else {
        // Only named exports
        lines.push(`export { ${cleanedExports.join(', ')} } from './${modulePath}';`);
      }
    }

    // Add newline at end of file
    return lines.join('\n') + '\n';
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
