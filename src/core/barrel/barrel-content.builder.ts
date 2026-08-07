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
  STAR_EXPORT_NAME,
} from '../../types/index.js';
import { sortAlphabetically } from '../../utils/string.js';

const COMMONJS_TYPESCRIPT_EXTENSION = '.cts';
const ES_MODULE_TYPESCRIPT_EXTENSION = '.mts';

interface IEntryReservation {
  emittedNames: ReadonlySet<string>;
  entry: BarrelEntry;
}

interface IExportReservation {
  emittedNames: ReadonlySet<string>;
  barrelExport?: BarrelExport;
}

interface IReservedExports {
  emittedNames: ReadonlySet<string>;
  exports: BarrelExport[];
}

/**
 * Converts a legacy export name string to a BarrelExport object.
 * @param name The export name to convert.
 * @returns The corresponding BarrelExport object.
 */
function legacyExportFromName(name: string): BarrelExport {
  if (name === DEFAULT_EXPORT_NAME) {
    return { kind: BarrelExportKind.Default };
  }
  if (name === STAR_EXPORT_NAME) {
    return { kind: BarrelExportKind.Star, typeOnly: false };
  }
  return { kind: BarrelExportKind.Value, name };
}

/**
 * Returns a Map copy containing one updated key-value pair.
 * @param source Source map.
 * @param key Key to update.
 * @param value Value to store.
 * @returns Updated Map copy.
 */
function withMapEntry<Key, Value>(
  source: ReadonlyMap<Key, Value>,
  key: Key,
  value: Value,
): Map<Key, Value> {
  const entry: readonly [Key, Value] = [key, value];
  return new Map([...source, entry]);
}

/**
 * Service to build the content of a barrel file from exports.
 */
export class BarrelContentBuilder {
  /**
   * Builds the content of a barrel file from export entries.
   * @param entries Map of file paths to export arrays.
   * @param directoryPath The directory path for relative imports.
   * @param exportExtension The file extension to use for exports (e.g., '.js' or '').
   * @returns The barrel file content as a string.
   */
  buildContent(
    entries: ReadonlyMap<string, string[]>,
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
    entries: ReadonlyMap<string, BarrelEntry>,
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
  buildContent(
    entries: ReadonlyMap<string, BarrelEntry | string[]>,
    _directoryPath: string,
    exportExtension = '',
  ): Promise<string> {
    const normalizedEntries = this.normalizeEntries(entries);
    const lines = this.collectAllExportLines(normalizedEntries, exportExtension);
    return Promise.resolve(lines.join(NEWLINE) + NEWLINE);
  }

  /**
   * Collects all export lines from the normalized entry map without starting file-system work.
   * @param normalizedEntries Map of relative paths to barrel entries.
   * @param exportExtension The file extension to use for exports.
   * @returns Flattened array of all export lines.
   */
  private collectAllExportLines(
    normalizedEntries: ReadonlyMap<string, BarrelEntry>,
    exportExtension: string,
  ): string[] {
    const sortedPaths = sortAlphabetically(normalizedEntries.keys());
    let emittedNames: ReadonlySet<string> = new Set<string>();
    const runtimeExportNames = this.collectRuntimeExportNames(normalizedEntries);
    return sortedPaths.flatMap((relativePath) => {
      const entry = normalizedEntries.get(relativePath);
      if (!entry) return [];
      const reservation = this.reserveUniqueExports(entry, emittedNames, runtimeExportNames);
      emittedNames = reservation.emittedNames;
      return this.createLinesForEntry(relativePath, reservation.entry, exportExtension);
    });
  }

  /**
   * Removes duplicate symbol exports within and across file entries. Paths are processed in sorted
   * order, so the first module deterministically owns an ambiguous symbol and generated barrels
   * never contain duplicate named or default exports.
   * @param entry Entry to filter.
   * @param emittedNames Names already emitted by earlier file entries.
   * @param runtimeExportNames Names that have a runtime export in any file entry.
   * @returns The entry with only unique exports.
   */
  private reserveUniqueExports(
    entry: Readonly<BarrelEntry>,
    emittedNames: ReadonlySet<string>,
    runtimeExportNames: ReadonlySet<string>,
  ): IEntryReservation {
    if (entry.kind === BarrelEntryKind.Directory) {
      return { emittedNames, entry };
    }

    const exportsByName = this.deduplicateEntryExports(entry.exports);
    const initial: IReservedExports = { emittedNames, exports: [] };
    const reservation = Array.from(exportsByName).reduce(
      (state, [name, barrelExport]) =>
        this.appendReservedExport(state, name, barrelExport, runtimeExportNames),
      initial,
    );
    return {
      emittedNames: reservation.emittedNames,
      entry: { exports: reservation.exports, kind: BarrelEntryKind.File },
    };
  }

  /**
   * Appends an export reservation to immutable accumulator state.
   * @param state Current reservation state.
   * @param name Public export name.
   * @param barrelExport Export metadata.
   * @param runtimeExportNames Names that have runtime exports.
   * @returns Updated immutable reservation state.
   */
  private appendReservedExport(
    state: Readonly<IReservedExports>,
    name: string,
    barrelExport: Readonly<BarrelExport>,
    runtimeExportNames: ReadonlySet<string>,
  ): IReservedExports {
    const reservation = this.reserveExport(
      name,
      barrelExport,
      state.emittedNames,
      runtimeExportNames,
    );
    return {
      emittedNames: reservation.emittedNames,
      exports: reservation.barrelExport
        ? [...state.exports, reservation.barrelExport]
        : state.exports,
    };
  }

  /**
   * Collects public names that are available as runtime values in any file entry.
   * This prevents an alphabetically earlier type-only declaration from hiding a later value.
   * @param entries Entries to inspect.
   * @returns Names with at least one runtime value export.
   */
  private collectRuntimeExportNames(
    entries: ReadonlyMap<string, BarrelEntry>,
  ): ReadonlySet<string> {
    const runtimeExportNames = Array.from(entries.values()).flatMap((entry) =>
      this.getRuntimeExportNames(entry),
    );
    return new Set(runtimeExportNames);
  }

  /**
   * Gets the runtime value names from one file entry.
   * @param entry Entry to inspect.
   * @returns Runtime value names declared by the entry.
   */
  private getRuntimeExportNames(entry: Readonly<BarrelEntry> | undefined): string[] {
    if (!entry || entry.kind !== BarrelEntryKind.File) return [];
    return entry.exports.flatMap((barrelExport) =>
      barrelExport.kind === BarrelExportKind.Value ? [barrelExport.name] : [],
    );
  }

  /**
   * Deduplicates the exports declared by one file, preferring values over type-only exports.
   * @param exports Exports declared by a single source file.
   * @returns Exports keyed by public identity, with runtime values preferred over type-only entries.
   */
  private deduplicateEntryExports(exports: readonly BarrelExport[]): Map<string, BarrelExport> {
    return exports.reduce((exportsByName, barrelExport) => {
      const name = this.getExportIdentity(barrelExport);
      const existing = exportsByName.get(name);
      return !existing || existing.kind === BarrelExportKind.Type
        ? withMapEntry(exportsByName, name, barrelExport)
        : exportsByName;
    }, new Map<string, BarrelExport>());
  }

  /**
   * Returns the public symbol identity used for duplicate detection.
   * @param barrelExport Export metadata to identify.
   * @returns The exported public name.
   */
  private getExportIdentity(barrelExport: Readonly<BarrelExport>): string {
    if (barrelExport.kind === BarrelExportKind.Default) {
      return DEFAULT_EXPORT_NAME;
    }
    return barrelExport.kind === BarrelExportKind.Star ? STAR_EXPORT_NAME : barrelExport.name;
  }

  /**
   * Reserves one public name unless an earlier file already owns it.
   * @param name Public export name.
   * @param barrelExport Export metadata.
   * @param emittedNames Names owned by earlier files.
   * @param runtimeExportNames Names that have a runtime export in any file entry.
   * @returns Updated reservation state and the export to emit, when one remains eligible.
   */
  private reserveExport(
    name: string,
    barrelExport: Readonly<BarrelExport>,
    emittedNames: ReadonlySet<string>,
    runtimeExportNames: ReadonlySet<string>,
  ): IExportReservation {
    if (barrelExport.kind === BarrelExportKind.Star) {
      return { barrelExport, emittedNames };
    }
    if (barrelExport.kind === BarrelExportKind.Type && runtimeExportNames.has(name)) {
      return { emittedNames };
    }
    if (emittedNames.has(name)) {
      return { emittedNames };
    }
    return { barrelExport, emittedNames: new Set([...emittedNames, name]) };
  }

  /**
   * Normalizes mixed entry maps to barrel entries.
   * @param entries Source entries (string[] or BarrelEntry)
   * @returns Map of BarrelEntry
   */
  private normalizeEntries(
    entries: ReadonlyMap<string, BarrelEntry | string[]>,
  ): Map<string, BarrelEntry> {
    const normalizedEntries = Array.from(entries).flatMap(([relativePath, entry]) => {
      if (!entry) return [];
      const normalizedEntry: BarrelEntry = Array.isArray(entry)
        ? { kind: BarrelEntryKind.File, exports: entry.map(legacyExportFromName) }
        : entry;
      const normalizedPair: readonly [string, BarrelEntry] = [relativePath, normalizedEntry];
      return [normalizedPair];
    });
    return new Map(normalizedEntries);
  }

  /**
   * Creates export lines for a given entry.
   * @param relativePath The entry path
   * @param entry The entry metadata
   * @param exportExtension The file extension to use for exports
   * @returns export lines for the entry
   */
  private createLinesForEntry(
    relativePath: string,
    entry: Readonly<BarrelEntry>,
    exportExtension: string,
  ): string[] {
    if (entry.kind === BarrelEntryKind.Directory) {
      return this.buildDirectoryExportLines(relativePath, exportExtension);
    }

    return this.buildFileExportLines(relativePath, entry.exports, exportExtension);
  }

  /**
   * Builds export statement(s) for a directory entry.
   * @param relativePath The directory path
   * @param exportExtension The file extension to use for exports
   * @returns The export statement(s)
   */
  private buildDirectoryExportLines(relativePath: string, exportExtension: string): string[] {
    const modulePath = this.getDirectoryModulePath(relativePath, exportExtension);
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
  private isRelevantExport(exp: Readonly<BarrelExport>): boolean {
    return exp.kind === BarrelExportKind.Default || exp.kind === BarrelExportKind.Star
      ? true
      : !exp.name.includes(PARENT_DIRECTORY_SEGMENT);
  }

  /**
   * Builds export statement(s) for a file and its exports.
   * @param filePath The file path
   * @param exports The exports from the file
   * @param exportExtension The file extension to use for exports
   * @returns The export statement(s)
   */
  private buildFileExportLines(
    filePath: string,
    exports: readonly BarrelExport[],
    exportExtension: string,
  ): string[] {
    const cleanedExports = exports.filter(this.isRelevantExport.bind(this));

    // Skip files with no exports
    if (cleanedExports.length === 0) {
      return [];
    }

    // Convert file path to module path (remove .ts extension and normalize)
    const modulePath = this.getFileModulePath(filePath, exportExtension);

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
  private generateExportStatements(modulePath: string, exports: readonly BarrelExport[]): string[] {
    const valueNames = this.getExportNames(exports, BarrelExportKind.Value);
    const typeNames = this.getExportNames(exports, BarrelExportKind.Type);
    const namedLine = this.buildNamedExportLine(modulePath, valueNames, typeNames);
    const starLine = exports.find((barrelExport) => barrelExport.kind === BarrelExportKind.Star);
    const defaultLine = exports.some(this.isDefaultKindExport.bind(this))
      ? [`export { default } from './${modulePath}';`]
      : [];
    const starLines = starLine
      ? [`export${starLine.typeOnly ? ' type' : ''} * from './${modulePath}';`]
      : [];
    return [...starLines, ...(namedLine ? [namedLine] : []), ...defaultLine];
  }

  /**
   * Checks whether a barrel export is a default export.
   * @param exp The barrel export to check.
   * @returns True if the export kind is Default.
   */
  private isDefaultKindExport(exp: Readonly<BarrelExport>): boolean {
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
    valueNames: readonly string[],
    typeNames: readonly string[],
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
   * @param exports Candidate exports from one module.
   * @param kind Named export kind to select.
   * @returns Selected public names in deterministic alphabetical order.
   */
  private getExportNames(
    exports: readonly BarrelExport[],
    kind: BarrelExportKind.Value | BarrelExportKind.Type,
  ): string[] {
    /**
     * Checks whether an export has the given kind and a name property.
     * @param exp - The barrel export to check.
     * @returns True if the export matches the kind and has a name.
     */
    const matchesKind = (exp: Readonly<BarrelExport>): exp is BarrelExport & { name: string } =>
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
   * Converts a directory path to its barrel module path.
   * @param directoryPath Directory path to export.
   * @param exportExtension Extension convention used by the containing barrel.
   * @returns Directory module path targeting its index module when extensions are explicit.
   */
  private getDirectoryModulePath(directoryPath: string, exportExtension: string): string {
    return exportExtension ? `${directoryPath}/index${exportExtension}` : directoryPath;
  }

  /**
   * Converts a TypeScript file path to its runtime module path.
   * @param filePath TypeScript source path to export.
   * @param exportExtension Extension convention used by ordinary TypeScript files.
   * @returns Normalized runtime module path.
   */
  private getFileModulePath(filePath: string, exportExtension: string): string {
    // For files, remove the TypeScript extension and replace it with the runtime extension.
    const sourceExtension = path.extname(filePath).toLowerCase();
    const runtimeExtension =
      sourceExtension === ES_MODULE_TYPESCRIPT_EXTENSION
        ? '.mjs'
        : sourceExtension === COMMONJS_TYPESCRIPT_EXTENSION
          ? '.cjs'
          : exportExtension;
    const modulePath = filePath.replace(/\.(?:ts|tsx|mts|cts)$/i, '') + runtimeExtension;
    // Normalize path separators for cross-platform compatibility
    return modulePath.replaceAll(/\\/g, '/');
  }
}
