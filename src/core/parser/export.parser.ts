import { DEFAULT_EXPORT_NAME, type IParsedExport } from '../../types/index.js';
import { splitAndClean } from '../../utils/string.js';

/**
 * Service responsible for parsing TypeScript exports.
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
  extractExports(content: string): IParsedExport[] {
    const exportMap = new Map<string, IParsedExport>();
    const cleanedContent = this.removeNonCodeContent(content);

    this.collectNamedExports(cleanedContent, exportMap);
    const hasListDefault = this.collectNamedExportLists(cleanedContent, exportMap);

    const hasDefaultExport = hasListDefault || /export\s+default\s+/.test(cleanedContent);

    const result = Array.from(exportMap.values());
    if (hasDefaultExport) {
      result.push({ name: DEFAULT_EXPORT_NAME, typeOnly: false });
    }

    return result;
  }

  /**
   * Removes comments and string literals from code to prevent false positives.
   * This ensures that export statements inside strings (e.g., in test files)
   * are not incorrectly parsed as actual exports.
   * @param content The code content
   * @returns Content with comments and string literals removed
   */
  private removeNonCodeContent(content: string): string {
    let result = content;
    // Remove multi-line comments
    result = result.replaceAll(/\/\*[\s\S]*?\*\//g, '');
    // Remove single-line comments
    result = result.replaceAll(/\/\/.*$/gm, '');
    // Remove template literals (backtick strings), handling escaped backticks
    result = result.replaceAll(/`(?:[^`\\]|\\.)*`/g, '""');
    // Remove double-quoted strings, handling escaped quotes
    result = result.replaceAll(/"(?:[^"\\]|\\.)*"/g, '""');
    // Remove single-quoted strings, handling escaped quotes
    result = result.replaceAll(/'(?:[^'\\]|\\.)*'/g, "''");
    return result;
  }

  private collectNamedExports(content: string, exportMap: Map<string, IParsedExport>): void {
    const namedExportPattern =
      /export\s+(?:abstract\s+)?(class|interface|type|function|const|enum|let|var)\s+([A-Za-z_$][A-Za-z0-9_$]*)/g;
    let match: RegExpExecArray | null;

    while ((match = namedExportPattern.exec(content)) !== null) {
      const keyword = match[1];
      const identifier = match[2];
      const typeOnly = keyword === 'interface' || keyword === 'type';
      this.recordNamedExport(exportMap, identifier, typeOnly);
    }
  }

  private collectNamedExportLists(content: string, exportMap: Map<string, IParsedExport>): boolean {
    const exportListPattern = /export\s*(type\s+)?\{([^}]+)\}/g;
    let match: RegExpExecArray | null;
    let hasDefault = false;

    // istanbul ignore next
    while ((match = exportListPattern.exec(content)) !== null) {
      const entries = this.parseExportListEntries(match[2], Boolean(match[1]));

      for (const { name, typeOnly } of entries) {
        if (name.toLowerCase() === DEFAULT_EXPORT_NAME) {
          hasDefault = true;
          continue;
        }

        this.recordNamedExport(exportMap, name, typeOnly);
      }
    }

    return hasDefault;
  }

  private parseExportListEntries(
    rawList: string,
    typeModifierPresent: boolean,
  ): Array<{ name: string; typeOnly: boolean }> {
    return rawList
      .split(',')
      .flatMap((segment) => splitAndClean(segment))
      .map((segment) => {
        const tokens = splitAndClean(segment, /\s+as\s+/i);
        const sourceToken = tokens[0] ?? '';
        const aliasToken = tokens.at(-1) ?? '';
        const typeOnly = typeModifierPresent || /^type\s+/i.test(sourceToken);
        const cleanedName = typeOnly ? aliasToken.replace(/^type\s+/i, '') : aliasToken;

        return { name: cleanedName, typeOnly };
      })
      .filter((entry): entry is { name: string; typeOnly: boolean } =>
        Boolean(entry?.name?.length),
      );
  }

  private recordNamedExport(
    map: Map<string, IParsedExport>,
    name: string,
    typeOnly: boolean,
  ): void {
    const existing = map.get(name);

    if (!existing) {
      map.set(name, { name, typeOnly });
      return;
    }

    map.set(name, { name, typeOnly: existing.typeOnly && typeOnly });
  }
}
