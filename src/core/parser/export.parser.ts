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

import {
  type BindingName,
  type ExportDeclaration,
  type ExportSpecifier,
  Node,
  Project,
  ScriptKind,
  type SourceFile,
  type Statement,
} from 'ts-morph';

import { DEFAULT_EXPORT_NAME, type IParsedExport, STAR_EXPORT_NAME } from '../../types/index.js';

// Script kind mapping for file extensions
const SCRIPT_KIND_MAP: Record<string, ScriptKind> = {
  '.tsx': ScriptKind.TSX,
  '.jsx': ScriptKind.JSX,
  '.js': ScriptKind.JS,
  '.mjs': ScriptKind.JS,
  '.cjs': ScriptKind.JS,
};

/**
 * Options describing the type-only status of an export to record.
 */
interface IRecordExportOptions {
  typeOnly: boolean;
}

/**
 * Options describing the specifier and type-only status of a named export declaration.
 */
interface INamedExportOptions {
  isTypeOnly: boolean;
}

/**
 * Service responsible for parsing TypeScript exports using the TypeScript AST.
 * This provides accurate parsing by using the TypeScript compiler itself,
 * avoiding false positives from export statements inside strings, comments,
 * or regex literals.
 */
export class ExportParser {
  private readonly project = this.createProject();

  /**
   * Extracts all export statements from TypeScript code using AST parsing.
   * @param content Source text to inspect.
   * @param fileName File name used to select the correct TypeScript or JavaScript parser mode.
   * @returns Unique public exports in source order, including a synthesized default entry when needed.
   */
  extractExports(content: string, fileName = 'temp.ts'): IParsedExport[] {
    const sourceFile = this.project.createSourceFile(fileName, content, {
      overwrite: true,
      scriptKind: this.getScriptKind(fileName),
    });

    try {
      const declaredExports = this.collectExportDeclarations(sourceFile);
      const exportMap = this.collectExportedStatements(sourceFile, declaredExports);
      return this.buildResult(sourceFile, exportMap);
    } finally {
      this.project.removeSourceFile(sourceFile);
    }
  }

  /**
   * Creates a new in-memory TypeScript project for parsing.
   * @returns A new Project instance configured for in-memory use.
   */
  private createProject(): Project {
    return new Project({
      useInMemoryFileSystem: true,
      compilerOptions: { allowJs: true, noEmit: true, skipLibCheck: true },
    });
  }

  /**
   * Determines the script kind for a file based on its extension.
   * @param fileName File name whose extension determines the parser mode.
   * @returns The matching ts-morph script kind, defaulting to TypeScript.
   */
  private getScriptKind(fileName: string): ScriptKind {
    /**
     * Checks whether the filename ends with the given extension.
     * @param ext - The file extension to match.
     * @returns True if the filename ends with the extension.
     */
    const isMatchingExtension = (ext: string): boolean => fileName.endsWith(ext);
    const ext = Object.keys(SCRIPT_KIND_MAP).find(isMatchingExtension);
    return ext ? SCRIPT_KIND_MAP[ext] : ScriptKind.TS;
  }

  /**
   * Builds the final export list and ensures default exports are included.
   * @param sourceFile Parsed source used to detect default exports.
   * @param exportMap Named exports collected from declarations and statements.
   * @returns Collected exports with one default entry added when the source defines one.
   */
  private buildResult(
    sourceFile: Readonly<SourceFile>,
    exportMap: ReadonlyMap<string, IParsedExport>,
  ): IParsedExport[] {
    const result = Array.from(exportMap.values());
    /**
     * Checks whether a parsed export is the default export.
     * @param e - The parsed export to check.
     * @returns True if the export name matches the default export name.
     */
    const isDefaultExport = (e: Readonly<IParsedExport>): boolean => e.name === DEFAULT_EXPORT_NAME;
    if (this.hasDefaultExport(sourceFile) && !result.some(isDefaultExport)) {
      return [...result, { name: DEFAULT_EXPORT_NAME, typeOnly: false }];
    }
    return result;
  }

  /**
   * Collects export declarations (export { ... } from ...) from the source file.
   * @param sourceFile Parsed source containing re-export declarations.
   * @returns Exports collected from every re-export declaration.
   */
  private collectExportDeclarations(
    sourceFile: Readonly<SourceFile>,
  ): ReadonlyMap<string, IParsedExport> {
    const noExports: ReadonlyMap<string, IParsedExport> = new Map<string, IParsedExport>();
    return sourceFile
      .getExportDeclarations()
      .reduce<ReadonlyMap<string, IParsedExport>>(
        (exportMap, exportDeclaration) =>
          this.processExportDeclaration(exportDeclaration, exportMap),
        noExports,
      );
  }

  /**
   * Processes a single export declaration and records its named exports.
   * @param exportDecl Declaration to classify as named, namespace, or wildcard.
   * @param exportMap Export accumulator to update.
   * @returns A new accumulator containing exports from the declaration.
   */
  private processExportDeclaration(
    exportDecl: Readonly<ExportDeclaration>,
    exportMap: ReadonlyMap<string, IParsedExport>,
  ): ReadonlyMap<string, IParsedExport> {
    const hasModuleSpecifier = Boolean(exportDecl.getModuleSpecifier());
    const isTypeOnly = exportDecl.isTypeOnly();
    const namespaceExport = exportDecl.getNamespaceExport();

    if (namespaceExport) {
      return this.recordExport(exportMap, namespaceExport.getName(), { typeOnly: isTypeOnly });
    }

    if (hasModuleSpecifier && !exportDecl.compilerNode.exportClause) {
      return this.recordExport(exportMap, STAR_EXPORT_NAME, { typeOnly: isTypeOnly });
    }

    return exportDecl
      .getNamedExports()
      .reduce(
        (namedExports, namedExport) =>
          this.processNamedExport(namedExport, { isTypeOnly }, namedExports),
        exportMap,
      );
  }

  /**
   * Records an individual named export, accounting for aliasing and type-only flags.
   * @param namedExport Export specifier whose public alias is recorded.
   * @param options Type-only state inherited from the containing declaration.
   * @param exportMap Export accumulator to update.
   * @returns A new accumulator containing the named export.
   */
  private processNamedExport(
    namedExport: Readonly<ExportSpecifier>,
    options: Readonly<INamedExportOptions>,
    exportMap: ReadonlyMap<string, IParsedExport>,
  ): ReadonlyMap<string, IParsedExport> {
    const alias = namedExport.getAliasNode()?.getText();

    const name = alias ?? namedExport.getName();
    const typeOnly = options.isTypeOnly || namedExport.isTypeOnly();
    return this.recordExport(exportMap, name, { typeOnly });
  }

  /**
   * Collects exported statements such as types, classes, functions, enums, and variables.
   * @param sourceFile Parsed source containing directly exported statements.
   * @param exportMap Export accumulator to update.
   * @returns A new accumulator containing all directly exported statements.
   */
  private collectExportedStatements(
    sourceFile: Readonly<SourceFile>,
    exportMap: ReadonlyMap<string, IParsedExport>,
  ): ReadonlyMap<string, IParsedExport> {
    return sourceFile.getStatements().reduce((collectedExports, statement) => {
      const withTypes = this.processTypeDeclaration(statement, collectedExports);
      const withClasses = this.processClassDeclaration(statement, withTypes);
      const withFunctions = this.processFunctionDeclaration(statement, withClasses);
      const withEnums = this.processEnumDeclaration(statement, withFunctions);
      const withImports = this.processImportEqualsDeclaration(statement, withEnums);
      const withModules = this.processModuleDeclaration(statement, withImports);
      return this.processVariableStatement(statement, withModules);
    }, exportMap);
  }

  /**
   * Records exported interfaces and type aliases.
   * @param stmt Statement to inspect for an exported interface or type alias.
   * @param map Export accumulator to update.
   * @returns A new accumulator when an exported type is found; otherwise the input accumulator.
   */
  private processTypeDeclaration(
    stmt: Statement,
    map: ReadonlyMap<string, IParsedExport>,
  ): ReadonlyMap<string, IParsedExport> {
    if (Node.isInterfaceDeclaration(stmt) && stmt.isExported()) {
      return this.recordExport(map, stmt.getName(), { typeOnly: true });
    }
    if (Node.isTypeAliasDeclaration(stmt) && stmt.isExported()) {
      return this.recordExport(map, stmt.getName(), { typeOnly: true });
    }
    return map;
  }

  /**
   * Records exported class declarations (excluding default exports).
   * @param stmt Statement to inspect for a named, non-default class export.
   * @param map Export accumulator to update.
   * @returns A new accumulator when a class export is found; otherwise the input accumulator.
   */
  private processClassDeclaration(
    stmt: Statement,
    map: ReadonlyMap<string, IParsedExport>,
  ): ReadonlyMap<string, IParsedExport> {
    if (!Node.isClassDeclaration(stmt) || !stmt.isExported() || stmt.isDefaultExport()) {
      return map;
    }
    const name = stmt.getName();
    return name ? this.recordExport(map, name, { typeOnly: false }) : map;
  }

  /**
   * Records exported function declarations (excluding default exports).
   * @param stmt Statement to inspect for a named, non-default function export.
   * @param map Export accumulator to update.
   * @returns A new accumulator when a function export is found; otherwise the input accumulator.
   */
  private processFunctionDeclaration(
    stmt: Statement,
    map: ReadonlyMap<string, IParsedExport>,
  ): ReadonlyMap<string, IParsedExport> {
    if (!Node.isFunctionDeclaration(stmt) || !stmt.isExported() || stmt.isDefaultExport()) {
      return map;
    }
    const name = stmt.getName();
    return name ? this.recordExport(map, name, { typeOnly: false }) : map;
  }

  /**
   * Records exported enum declarations.
   * @param stmt Statement to inspect for an exported enum.
   * @param map Export accumulator to update.
   * @returns A new accumulator when an enum export is found; otherwise the input accumulator.
   */
  private processEnumDeclaration(
    stmt: Statement,
    map: ReadonlyMap<string, IParsedExport>,
  ): ReadonlyMap<string, IParsedExport> {
    return Node.isEnumDeclaration(stmt) && stmt.isExported()
      ? this.recordExport(map, stmt.getName(), { typeOnly: false })
      : map;
  }

  /**
   * Records exported variable declarations.
   * @param stmt Statement to inspect for exported variable bindings.
   * @param map Export accumulator to update.
   * @returns An accumulator containing every exported variable binding.
   */
  private processVariableStatement(
    stmt: Statement,
    map: ReadonlyMap<string, IParsedExport>,
  ): ReadonlyMap<string, IParsedExport> {
    if (!Node.isVariableStatement(stmt) || !stmt.isExported()) {
      return map;
    }
    return stmt
      .getDeclarations()
      .reduce(
        (collectedExports, declaration) =>
          this.recordBindingNames(declaration.getNameNode(), collectedExports),
        map,
      );
  }

  /**
   * Records every identifier introduced by a variable binding pattern.
   * @param node Identifier or nested binding pattern.
   * @param map Export map to update.
   * @returns An accumulator containing each identifier in the binding pattern.
   */
  private recordBindingNames(
    node: BindingName,
    map: ReadonlyMap<string, IParsedExport>,
  ): ReadonlyMap<string, IParsedExport> {
    if (Node.isIdentifier(node)) {
      return this.recordExport(map, node.getText(), { typeOnly: false });
    }
    const elements = Node.isArrayBindingPattern(node)
      ? node.getElements().filter(Node.isBindingElement)
      : node.getElements();
    return elements.reduce(
      (collectedExports, element) =>
        this.recordBindingNames(element.getNameNode(), collectedExports),
      map,
    );
  }

  /**
   * Records an exported `import name =` declaration.
   * @param stmt Statement to inspect.
   * @param map Export map to update.
   * @returns A new accumulator when an exported import alias is found; otherwise the input map.
   */
  private processImportEqualsDeclaration(
    stmt: Statement,
    map: ReadonlyMap<string, IParsedExport>,
  ): ReadonlyMap<string, IParsedExport> {
    return Node.isImportEqualsDeclaration(stmt) && stmt.isExported()
      ? this.recordExport(map, stmt.getName(), { typeOnly: false })
      : map;
  }

  /**
   * Records an exported namespace or module declaration.
   * @param stmt Statement to inspect.
   * @param map Export map to update.
   * @returns A new accumulator when an exported namespace is found; otherwise the input map.
   */
  private processModuleDeclaration(
    stmt: Statement,
    map: ReadonlyMap<string, IParsedExport>,
  ): ReadonlyMap<string, IParsedExport> {
    return Node.isModuleDeclaration(stmt) && stmt.isExported()
      ? this.recordExport(map, stmt.getName(), { typeOnly: false })
      : map;
  }

  /**
   * Checks whether the source file has any form of default export.
   * @param sourceFile Parsed source to inspect.
   * @returns True when the source exposes a default export by symbol, alias, or statement.
   */
  private hasDefaultExport(sourceFile: Readonly<SourceFile>): boolean {
    if (sourceFile.getDefaultExportSymbol()) {
      return true;
    }
    return this.hasAliasedDefault(sourceFile) || this.hasDefaultStatement(sourceFile);
  }

  /**
   * Detects aliased default exports (export { foo as default }).
   * @param sourceFile Parsed source containing local export declarations.
   * @returns True when a local export aliases a symbol to `default`.
   */
  private hasAliasedDefault(sourceFile: Readonly<SourceFile>): boolean {
    for (const exportDecl of sourceFile.getExportDeclarations()) {
      if (exportDecl.getModuleSpecifier()) {
        continue;
      }
      const hasDefaultAlias = exportDecl
        .getNamedExports()
        .some(this.isDefaultAliasSpecifier.bind(this));
      if (hasDefaultAlias) {
        return true;
      }
    }
    return false;
  }

  /**
   * Checks whether an export specifier uses the default export name as its alias.
   * @param specifier - The export specifier to check.
   * @returns True if the specifier's alias is the default export name.
   */
  private isDefaultAliasSpecifier(specifier: Readonly<ExportSpecifier>): boolean {
    return specifier.getAliasNode()?.getText() === DEFAULT_EXPORT_NAME;
  }

  /**
   * Detects default export statements (class/function/export assignment).
   * @param sourceFile Parsed source containing candidate default-export statements.
   * @returns True when a statement defines a default class, function, or assignment export.
   */
  private hasDefaultStatement(sourceFile: Readonly<SourceFile>): boolean {
    return sourceFile.getStatements().some(this.isDefaultExportStatement.bind(this));
  }

  /**
   * Determines whether a statement represents a default export.
   * @param stmt Statement to classify.
   * @returns True for a default export assignment, class, or function; false for `export =`.
   */
  private isDefaultExportStatement(stmt: Statement): boolean {
    if (Node.isExportAssignment(stmt)) {
      return !stmt.isExportEquals();
    }
    if (Node.isClassDeclaration(stmt)) {
      return stmt.isDefaultExport();
    }
    if (Node.isFunctionDeclaration(stmt)) {
      return stmt.isDefaultExport();
    }
    return false;
  }

  /**
   * Inserts or merges an export entry, preserving type-only status.
   * @param map Export accumulator to update.
   * @param name Public export name used as the deduplication key.
   * @param options Type-only state for the newly observed export.
   * @returns A new accumulator with runtime exports preferred over type-only duplicates.
   */
  private recordExport(
    map: ReadonlyMap<string, IParsedExport>,
    name: string,
    options: Readonly<IRecordExportOptions>,
  ): ReadonlyMap<string, IParsedExport> {
    const existing = map.get(name);
    const merged = existing ? existing.typeOnly && options.typeOnly : options.typeOnly;
    return new Map([...map, [name, { name, typeOnly: merged }]]);
  }
}
