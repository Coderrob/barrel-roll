import { DEFAULT_EXPORT_NAME, type ParsedExport } from '../../types/index.js';
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
  extractExports(content: string): ParsedExport[] {
    const exportMap = new Map<string, ParsedExport>();
    const contentWithoutComments = this.removeComments(content);

    this.collectNamedExports(contentWithoutComments, exportMap);
    const hasListDefault = this.collectNamedExportLists(contentWithoutComments, exportMap);

    const hasDefaultExport = hasListDefault || /export\s+default\s+/.test(contentWithoutComments);

    const result = Array.from(exportMap.values());
    if (hasDefaultExport) {
      result.push({ name: DEFAULT_EXPORT_NAME, typeOnly: false });
    }

    return result;
  }

  /**
   * Removes single-line and multi-line comments from code.
   * @param content The code content
   * @returns Content without comments
   */
  private removeComments(content: string): string {
    // Remove multi-line comments
    let result = content.replaceAll(/\/\*[\s\S]*?\*\//g, '');
    // Remove single-line comments
    result = result.replaceAll(/\/\/.*$/gm, '');
    return result;
  }

  private collectNamedExports(content: string, exportMap: Map<string, ParsedExport>): void {
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

  private collectNamedExportLists(content: string, exportMap: Map<string, ParsedExport>): boolean {
    const exportListPattern = /export\s*(type\s+)?\{([^}]+)\}/g;
    let match: RegExpExecArray | null;
    let hasDefault = false;

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

  private recordNamedExport(map: Map<string, ParsedExport>, name: string, typeOnly: boolean): void {
    const existing = map.get(name);

    if (!existing) {
      map.set(name, { name, typeOnly });
      return;
    }

    map.set(name, { name, typeOnly: existing.typeOnly && typeOnly });
  }
}
