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
  type ExportDeclaration,
  type ExportSpecifier,
  Node,
  Project,
  ScriptKind,
  type SourceFile,
  type Statement,
} from 'ts-morph';

import { DEFAULT_EXPORT_NAME, type IParsedExport } from '../../types/index.js';

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
  hasModuleSpecifier: boolean;
  isTypeOnly: boolean;
}

/**
 * Service responsible for parsing TypeScript exports using the TypeScript AST.
 * This provides accurate parsing by using the TypeScript compiler itself,
 * avoiding false positives from export statements inside strings, comments,
 * or regex literals.
 */
export class ExportParser {
  /**
   * Extracts all export statements from TypeScript code using AST parsing.
   * @param content TODO: describe parameter
   * @param fileName TODO: describe parameter
   * @returns TODO: describe return value
   */
  extractExports(content: string, fileName = 'temp.ts'): IParsedExport[] {
    const project = this.createProject();
    const exportMap = new Map<string, IParsedExport>();
    const sourceFile = project.createSourceFile(fileName, content, {
      overwrite: true,
      scriptKind: this.getScriptKind(fileName),
    });

    try {
      this.collectExportDeclarations(sourceFile, exportMap);
      this.collectExportedStatements(sourceFile, exportMap);
      return this.buildResult(sourceFile, exportMap);
    } finally {
      project.removeSourceFile(sourceFile);
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
   * @param fileName TODO: describe parameter
   * @returns TODO: describe return value
   */
  private getScriptKind(fileName: string): ScriptKind {
    /**
     * Checks whether the filename ends with the given extension.
     * @param ext - The file extension to match.
     * @returns True if the filename ends with the extension.
     */
    const matchesExtension = (ext: string): boolean => fileName.endsWith(ext);
    const ext = Object.keys(SCRIPT_KIND_MAP).find(matchesExtension);
    return ext ? SCRIPT_KIND_MAP[ext] : ScriptKind.TS;
  }

  /**
   * Builds the final export list and ensures default exports are included.
   * @param sourceFile TODO: describe parameter
   * @param exportMap TODO: describe parameter
   * @returns TODO: describe return value
   */
  private buildResult(
    sourceFile: SourceFile,
    exportMap: Map<string, IParsedExport>,
  ): IParsedExport[] {
    const result = Array.from(exportMap.values());
    /**
     * Checks whether a parsed export is the default export.
     * @param e - The parsed export to check.
     * @returns True if the export name matches the default export name.
     */
    const isDefaultExport = (e: IParsedExport): boolean => e.name === DEFAULT_EXPORT_NAME;
    if (this.hasDefaultExport(sourceFile) && !result.some(isDefaultExport)) {
      result.push({ name: DEFAULT_EXPORT_NAME, typeOnly: false });
    }
    return result;
  }

  /**
   * Collects export declarations (export { ... } from ...) from the source file.
   * @param sourceFile TODO: describe parameter
   * @param exportMap TODO: describe parameter
   */
  private collectExportDeclarations(
    sourceFile: SourceFile,
    exportMap: Map<string, IParsedExport>,
  ): void {
    for (const exportDecl of sourceFile.getExportDeclarations()) {
      this.processExportDeclaration(exportDecl, exportMap);
    }
  }

  /**
   * Processes a single export declaration and records its named exports.
   * @param exportDecl TODO: describe parameter
   * @param exportMap TODO: describe parameter
   */
  private processExportDeclaration(
    exportDecl: ExportDeclaration,
    exportMap: Map<string, IParsedExport>,
  ): void {
    const hasModuleSpecifier = Boolean(exportDecl.getModuleSpecifier());
    const isTypeOnly = exportDecl.isTypeOnly();

    for (const namedExport of exportDecl.getNamedExports()) {
      this.processNamedExport(namedExport, { hasModuleSpecifier, isTypeOnly }, exportMap);
    }
  }

  /**
   * Records an individual named export, accounting for aliasing and type-only flags.
   * @param namedExport TODO: describe parameter
   * @param options TODO: describe parameter
   * @param exportMap TODO: describe parameter
   */
  private processNamedExport(
    namedExport: ExportSpecifier,
    options: INamedExportOptions,
    exportMap: Map<string, IParsedExport>,
  ): void {
    const alias = namedExport.getAliasNode()?.getText();

    // Skip re-exports without aliases (export { foo } from './module')
    if (this.isUnaliasedReExport(options, alias)) {
      return;
    }

    const name = alias ?? namedExport.getName();
    const typeOnly = options.isTypeOnly || namedExport.isTypeOnly();
    this.recordExport(exportMap, name, { typeOnly });
  }

  /**
   * Determines whether a named export is an unaliased re-export (export { foo } from ...).
   * @param options TODO: describe parameter
   * @param alias TODO: describe parameter
   * @returns TODO: describe return value
   */
  private isUnaliasedReExport(options: INamedExportOptions, alias: string | undefined): boolean {
    return options.hasModuleSpecifier && !alias;
  }

  /**
   * Collects exported statements such as types, classes, functions, enums, and variables.
   * @param sourceFile TODO: describe parameter
   * @param exportMap TODO: describe parameter
   */
  private collectExportedStatements(
    sourceFile: SourceFile,
    exportMap: Map<string, IParsedExport>,
  ): void {
    for (const statement of sourceFile.getStatements()) {
      this.processTypeDeclaration(statement, exportMap);
      this.processClassDeclaration(statement, exportMap);
      this.processFunctionDeclaration(statement, exportMap);
      this.processEnumDeclaration(statement, exportMap);
      this.processVariableStatement(statement, exportMap);
    }
  }

  /**
   * Records exported interfaces and type aliases.
   * @param stmt TODO: describe parameter
   * @param map TODO: describe parameter
   */
  private processTypeDeclaration(stmt: Statement, map: Map<string, IParsedExport>): void {
    if (Node.isInterfaceDeclaration(stmt) && stmt.isExported()) {
      this.recordExport(map, stmt.getName(), { typeOnly: true });
    }
    if (Node.isTypeAliasDeclaration(stmt) && stmt.isExported()) {
      this.recordExport(map, stmt.getName(), { typeOnly: true });
    }
  }

  /**
   * Records exported class declarations (excluding default exports).
   * @param stmt TODO: describe parameter
   * @param map TODO: describe parameter
   */
  private processClassDeclaration(stmt: Statement, map: Map<string, IParsedExport>): void {
    if (!Node.isClassDeclaration(stmt) || !stmt.isExported() || stmt.isDefaultExport()) {
      return;
    }
    const name = stmt.getName();
    if (name) {
      this.recordExport(map, name, { typeOnly: false });
    }
  }

  /**
   * Records exported function declarations (excluding default exports).
   * @param stmt TODO: describe parameter
   * @param map TODO: describe parameter
   */
  private processFunctionDeclaration(stmt: Statement, map: Map<string, IParsedExport>): void {
    if (!Node.isFunctionDeclaration(stmt) || !stmt.isExported() || stmt.isDefaultExport()) {
      return;
    }
    const name = stmt.getName();
    if (name) {
      this.recordExport(map, name, { typeOnly: false });
    }
  }

  /**
   * Records exported enum declarations.
   * @param stmt TODO: describe parameter
   * @param map TODO: describe parameter
   */
  private processEnumDeclaration(stmt: Statement, map: Map<string, IParsedExport>): void {
    if (Node.isEnumDeclaration(stmt) && stmt.isExported()) {
      this.recordExport(map, stmt.getName(), { typeOnly: false });
    }
  }

  /**
   * Records exported variable declarations.
   * @param stmt TODO: describe parameter
   * @param map TODO: describe parameter
   */
  private processVariableStatement(stmt: Statement, map: Map<string, IParsedExport>): void {
    if (!Node.isVariableStatement(stmt) || !stmt.isExported()) {
      return;
    }
    for (const decl of stmt.getDeclarations()) {
      this.recordExport(map, decl.getName(), { typeOnly: false });
    }
  }

  /**
   * Checks whether the source file has any form of default export.
   * @param sourceFile TODO: describe parameter
   * @returns TODO: describe return value
   */
  private hasDefaultExport(sourceFile: SourceFile): boolean {
    if (sourceFile.getDefaultExportSymbol()) {
      return true;
    }
    return this.hasAliasedDefault(sourceFile) || this.hasDefaultStatement(sourceFile);
  }

  /**
   * Detects aliased default exports (export { foo as default }).
   * @param sourceFile TODO: describe parameter
   * @returns TODO: describe return value
   */
  private hasAliasedDefault(sourceFile: SourceFile): boolean {
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
  private isDefaultAliasSpecifier(specifier: ExportSpecifier): boolean {
    return specifier.getAliasNode()?.getText() === DEFAULT_EXPORT_NAME;
  }

  /**
   * Detects default export statements (class/function/export assignment).
   * @param sourceFile TODO: describe parameter
   * @returns TODO: describe return value
   */
  private hasDefaultStatement(sourceFile: SourceFile): boolean {
    return sourceFile.getStatements().some(this.isDefaultExportStatement.bind(this));
  }

  /**
   * Determines whether a statement represents a default export.
   * @param stmt TODO: describe parameter
   * @returns TODO: describe return value
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
   * @param map TODO: describe parameter
   * @param name TODO: describe parameter
   * @param options TODO: describe parameter
   */
  private recordExport(
    map: Map<string, IParsedExport>,
    name: string,
    options: IRecordExportOptions,
  ): void {
    const existing = map.get(name);
    const merged = existing ? existing.typeOnly && options.typeOnly : options.typeOnly;
    map.set(name, { name, typeOnly: merged });
  }
}
