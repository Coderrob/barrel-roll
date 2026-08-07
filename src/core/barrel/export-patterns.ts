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

import ts from 'typescript';

/** Location and module path of a re-export declaration in barrel content. */
export interface IBarrelReExport {
  end: number;
  path: string;
  start: number;
}

/**
 * Parses source text without constructing a compiler project or touching the file system.
 * @param fileName Virtual file name used to select TypeScript syntax.
 * @param content Source text to parse.
 * @returns Parsed TypeScript source file.
 */
function createSourceFile(fileName: string, content: string): ts.SourceFile {
  return ts.createSourceFile(fileName, content, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
}

/**
 * Detects the module extension convention used by the first re-export in barrel content.
 * @param content Barrel source text.
 * @returns The explicit JavaScript extension, an empty string, or null when no re-export exists.
 */
export function detectExtensionFromBarrelContent(content: string): string | null {
  const firstPath = findBarrelReExports(content)[0]?.path;
  return firstPath === undefined ? null : extractExtensionFromPath(firstPath);
}

/**
 * Extracts all normalized re-export module paths from complete barrel content.
 * @param content Barrel source text.
 * @returns Normalized paths found in re-export declarations.
 */
export function extractAllExportPaths(content: string): Set<string> {
  return new Set(
    findBarrelReExports(content).map((declaration) => normalizeExportPath(declaration.path)),
  );
}

/**
 * Extracts a module path when the supplied text consists of one re-export declaration.
 * @param text Source text containing a possible re-export.
 * @returns The module path, or null when the text is not exactly one re-export declaration.
 */
export function extractExportPath(text: string): string | null {
  const sourceFile = createSourceFile('export.ts', text);
  return hasSyntaxErrors(text) ? null : extractSingleReExportPath(sourceFile);
}

/**
 * Extracts the module extension convention from a re-export declaration.
 * @param line Source text containing a possible re-export.
 * @returns The explicit JavaScript extension, an empty string, or null for non-re-exports.
 */
export function extractExtensionFromLine(line: string): string | null {
  const exportPath = extractExportPath(line);
  return exportPath === null ? null : extractExtensionFromPath(exportPath);
}

/**
 * Returns the explicit runtime extension of a module path.
 * @param exportPath Module path to inspect.
 * @returns Its explicit JavaScript extension or an empty string.
 */
function extractExtensionFromPath(exportPath: string): string {
  const match = /\.(cjs|mjs|js)$/.exec(exportPath);
  return match ? `.${match[1]}` : '';
}

/**
 * Extracts a path from a syntax-valid source file containing exactly one re-export.
 * @param sourceFile Parsed source file.
 * @returns Its re-export path or null.
 */
function extractSingleReExportPath(sourceFile: Readonly<ts.SourceFile>): string | null {
  const declaration = getOnlyExportDeclaration(sourceFile);
  if (!declaration) return null;
  const { moduleSpecifier } = declaration;
  if (!moduleSpecifier) return null;
  if (!ts.isStringLiteral(moduleSpecifier)) return null;
  return moduleSpecifier.text;
}

/**
 * Parses barrel content with the TypeScript parser. Regex-based parsing is unsafe here because
 * braces and `from` clauses may occur inside comments and because export attributes evolve with
 * the language grammar.
 * @param content Source text to parse.
 * @returns Re-export declarations in source order.
 */
export function findBarrelReExports(content: string): IBarrelReExport[] {
  const sourceFile = createSourceFile('barrel.ts', content);
  return sourceFile.statements.flatMap((declaration) => {
    if (!ts.isExportDeclaration(declaration)) {
      return [];
    }
    const { moduleSpecifier } = declaration;
    if (!moduleSpecifier || !ts.isStringLiteral(moduleSpecifier)) {
      return [];
    }
    return [
      {
        end: declaration.end,
        path: moduleSpecifier.text,
        start: declaration.getStart(sourceFile),
      },
    ];
  });
}

/**
 * Gets the only statement when it is a syntax-valid export declaration.
 * @param sourceFile Parsed source file.
 * @returns Its sole export declaration or null.
 */
function getOnlyExportDeclaration(
  sourceFile: Readonly<ts.SourceFile>,
): ts.ExportDeclaration | null {
  const { statements } = sourceFile;
  if (statements.length !== 1) return null;
  const statement = statements[0];
  if (!statement) return null;
  return ts.isExportDeclaration(statement) ? statement : null;
}

/**
 * Returns whether TypeScript reports a syntactic error for source text.
 * @param content Source text to validate.
 * @returns True when parsing failed.
 */
function hasSyntaxErrors(content: string): boolean {
  return Boolean(
    ts
      .transpileModule(content, {
        compilerOptions: { noEmit: true },
        fileName: 'export.ts',
        reportDiagnostics: true,
      })
      .diagnostics?.some((diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error),
  );
}

/**
 * Checks whether text consists of one re-export declaration.
 * @param line Text to inspect.
 * @returns True for a re-export declaration.
 */
export function isExportLine(line: string): boolean {
  return extractExportPath(line) !== null;
}

/**
 * Compatibility helper for callers that stream export text line-by-line.
 * @param line A possible closing line of a multiline named re-export.
 * @returns True when the line contains a closing brace followed by a module clause.
 */
export function isMultilineExportEnd(line: string): boolean {
  return /\}\s*from\s*['"]/.test(line);
}

/**
 * Compatibility helper for callers that stream export text line-by-line.
 * Whole-content consumers should use {@link findBarrelReExports}.
 * @param line A possible opening line of a multiline named re-export.
 * @returns True when the line begins a named re-export that is not complete on that line.
 */
export function isMultilineExportStart(line: string): boolean {
  const trimmed = line.trim();
  return /^export(?:\s+type)?\s*\{/.test(trimmed) && !isExportLine(trimmed);
}

/**
 * Normalizes an export path for comparison by stripping JavaScript/TypeScript extensions and a
 * trailing `/index` segment.
 * @param exportPath Module path to normalize.
 * @returns Comparable module path.
 */
export function normalizeExportPath(exportPath: string): string {
  return exportPath
    .replace(/\\/g, '/')
    .replace(/\.(?:[cm]?[jt]sx?)$/, '')
    .replace(/\/index$/, '');
}
