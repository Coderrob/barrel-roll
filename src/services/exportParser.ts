/**
 * Service responsible for parsing TypeScript exports.
 * Follows Single Responsibility Principle by handling only export extraction logic.
 */
export class ExportParser {
  /**
   * Extracts all export statements from TypeScript code.
   * Supports:
   * - Named exports: export class, export interface, export type, export function, export const, export enum
   * - Default exports: export default
   *
   * Excludes:
   * - Re-exports from parent folders (export * from '../...')
   *
   * @param content The TypeScript file content
   * @returns Array of export names
   */
  extractExports(content: string): string[] {
    const exports: string[] = [];

    // Remove comments to avoid false matches
    const contentWithoutComments = this.removeComments(content);

    // Pattern for named exports (export class, interface, type, function, const, enum, let, var)
    const namedExportPattern =
      /export\s+(?:abstract\s+)?(?:class|interface|type|function|const|enum|let|var)\s+([A-Za-z_$][A-Za-z0-9_$]*)/g;
    let match;

    while ((match = namedExportPattern.exec(contentWithoutComments)) !== null) {
      exports.push(match[1]);
    }

    // Pattern for export { name1, name2 }
    const exportListPattern = /export\s*\{([^}]+)\}/g;
    while ((match = exportListPattern.exec(contentWithoutComments)) !== null) {
      const names = match[1]
        .split(',')
        .map((name) =>
          name
            .trim()
            .split(/\s+as\s+/)[0]
            .trim(),
        )
        .filter((name) => name.length > 0);
      exports.push(...names);
    }

    // Check for default export
    if (/export\s+default\s+/.test(contentWithoutComments)) {
      exports.push('default');
    }

    return [...new Set(exports)]; // Remove duplicates
  }

  /**
   * Removes single-line and multi-line comments from code.
   * @param content The code content
   * @returns Content without comments
   */
  private removeComments(content: string): string {
    // Remove multi-line comments
    let result = content.replace(/\/\*[\s\S]*?\*\//g, '');
    // Remove single-line comments
    result = result.replace(/\/\/.*$/gm, '');
    return result;
  }
}
