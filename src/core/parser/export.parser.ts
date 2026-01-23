import { Node, Project, ScriptKind, type SourceFile, type Statement } from 'ts-morph';

import { DEFAULT_EXPORT_NAME, type IParsedExport } from '../../types/index.js';

// Shared project instance for parsing - avoids creating new projects for each file
const parserProject = new Project({
  useInMemoryFileSystem: true,
  compilerOptions: { allowJs: true, noEmit: true, skipLibCheck: true },
});

// Script kind mapping for file extensions
const SCRIPT_KIND_MAP: Record<string, ScriptKind> = {
  '.tsx': ScriptKind.TSX,
  '.jsx': ScriptKind.JSX,
  '.js': ScriptKind.JS,
  '.mjs': ScriptKind.JS,
  '.cjs': ScriptKind.JS,
};

/**
 * Service responsible for parsing TypeScript exports using the TypeScript AST.
 * This provides accurate parsing by using the TypeScript compiler itself,
 * avoiding false positives from export statements inside strings, comments,
 * or regex literals.
 */
export class ExportParser {
  /**
   * Extracts all export statements from TypeScript code using AST parsing.
   */
  extractExports(content: string, fileName = 'temp.ts'): IParsedExport[] {
    const exportMap = new Map<string, IParsedExport>();
    const sourceFile = parserProject.createSourceFile(fileName, content, {
      overwrite: true,
      scriptKind: this.getScriptKind(fileName),
    });

    try {
      this.collectExportDeclarations(sourceFile, exportMap);
      this.collectExportedStatements(sourceFile, exportMap);
      return this.buildResult(sourceFile, exportMap);
    } finally {
      parserProject.removeSourceFile(sourceFile);
    }
  }

  private getScriptKind(fileName: string): ScriptKind {
    const ext = Object.keys(SCRIPT_KIND_MAP).find((e) => fileName.endsWith(e));
    return ext ? SCRIPT_KIND_MAP[ext] : ScriptKind.TS;
  }

  private buildResult(
    sourceFile: SourceFile,
    exportMap: Map<string, IParsedExport>,
  ): IParsedExport[] {
    const result = Array.from(exportMap.values());
    if (this.hasDefaultExport(sourceFile) && !result.some((e) => e.name === DEFAULT_EXPORT_NAME)) {
      result.push({ name: DEFAULT_EXPORT_NAME, typeOnly: false });
    }
    return result;
  }

  private collectExportDeclarations(
    sourceFile: SourceFile,
    exportMap: Map<string, IParsedExport>,
  ): void {
    for (const exportDecl of sourceFile.getExportDeclarations()) {
      this.processExportDeclaration(exportDecl, exportMap);
    }
  }

  private processExportDeclaration(
    exportDecl: ReturnType<SourceFile['getExportDeclarations']>[0],
    exportMap: Map<string, IParsedExport>,
  ): void {
    const hasModuleSpecifier = Boolean(exportDecl.getModuleSpecifier());
    const isTypeOnly = exportDecl.isTypeOnly();

    for (const namedExport of exportDecl.getNamedExports()) {
      this.processNamedExport(namedExport, hasModuleSpecifier, isTypeOnly, exportMap);
    }
  }

  private processNamedExport(
    namedExport: ReturnType<
      ReturnType<SourceFile['getExportDeclarations']>[0]['getNamedExports']
    >[0],
    hasModuleSpecifier: boolean,
    isTypeOnly: boolean,
    exportMap: Map<string, IParsedExport>,
  ): void {
    const alias = namedExport.getAliasNode()?.getText();

    // Skip re-exports without aliases (export { foo } from './module')
    if (this.isUnaliasedReExport(hasModuleSpecifier, alias)) {
      return;
    }

    const name = alias ?? namedExport.getName();
    const typeOnly = isTypeOnly || namedExport.isTypeOnly();
    this.recordExport(exportMap, name, typeOnly);
  }

  private isUnaliasedReExport(hasModuleSpecifier: boolean, alias: string | undefined): boolean {
    return hasModuleSpecifier && !alias;
  }

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

  private processTypeDeclaration(stmt: Statement, map: Map<string, IParsedExport>): void {
    if (Node.isInterfaceDeclaration(stmt) && stmt.isExported()) {
      this.recordExport(map, stmt.getName(), true);
    }
    if (Node.isTypeAliasDeclaration(stmt) && stmt.isExported()) {
      this.recordExport(map, stmt.getName(), true);
    }
  }

  private processClassDeclaration(stmt: Statement, map: Map<string, IParsedExport>): void {
    if (!Node.isClassDeclaration(stmt)) {
      return;
    }
    if (!stmt.isExported() || stmt.isDefaultExport()) {
      return;
    }
    const name = stmt.getName();
    if (name) {
      this.recordExport(map, name, false);
    }
  }

  private processFunctionDeclaration(stmt: Statement, map: Map<string, IParsedExport>): void {
    if (!Node.isFunctionDeclaration(stmt)) {
      return;
    }
    if (!stmt.isExported() || stmt.isDefaultExport()) {
      return;
    }
    const name = stmt.getName();
    if (name) {
      this.recordExport(map, name, false);
    }
  }

  private processEnumDeclaration(stmt: Statement, map: Map<string, IParsedExport>): void {
    if (Node.isEnumDeclaration(stmt) && stmt.isExported()) {
      this.recordExport(map, stmt.getName(), false);
    }
  }

  private processVariableStatement(stmt: Statement, map: Map<string, IParsedExport>): void {
    if (!Node.isVariableStatement(stmt) || !stmt.isExported()) {
      return;
    }
    for (const decl of stmt.getDeclarations()) {
      this.recordExport(map, decl.getName(), false);
    }
  }

  private hasDefaultExport(sourceFile: SourceFile): boolean {
    if (sourceFile.getDefaultExportSymbol()) {
      return true;
    }
    return this.hasAliasedDefault(sourceFile) || this.hasDefaultStatement(sourceFile);
  }

  private hasAliasedDefault(sourceFile: SourceFile): boolean {
    for (const exportDecl of sourceFile.getExportDeclarations()) {
      if (exportDecl.getModuleSpecifier()) {
        continue;
      }
      const hasDefaultAlias = exportDecl
        .getNamedExports()
        .some((e) => e.getAliasNode()?.getText() === 'default');
      if (hasDefaultAlias) {
        return true;
      }
    }
    return false;
  }

  private hasDefaultStatement(sourceFile: SourceFile): boolean {
    return sourceFile.getStatements().some((stmt) => this.isDefaultExportStatement(stmt));
  }

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

  private recordExport(map: Map<string, IParsedExport>, name: string, typeOnly: boolean): void {
    const existing = map.get(name);
    const merged = existing ? existing.typeOnly && typeOnly : typeOnly;
    map.set(name, { name, typeOnly: merged });
  }
}
