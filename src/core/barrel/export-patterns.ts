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

/**
 * Regex pattern for extracting export paths from barrel export lines.
 * Handles both single-line export statements.
 */
const EXPORT_PATH_PATTERN = /^export (?:\*|\{[^}]*\}) from '([^']+)';?$/;

/**
 * Regex pattern for multiline export statements.
 * Captures: export { ... } from 'path'; spanning multiple lines.
 */
const MULTILINE_EXPORT_PATTERN = /^export\s*\{[^}]*\}\s*from\s*'([^']+)'\s*;?$/s;

/**
 * Regex to detect the end of a multiline export: } from 'path'
 */
const MULTILINE_EXPORT_END = /\}\s*from\s*'/;

/**
 * Extracts the export path from a barrel export line or multiline block.
 * @param text The text to parse (can be single line or multiline).
 * @returns The export path if found, otherwise null.
 */
export function extractExportPath(text: string): string | null {
  const normalized = text.trim();
  // Try single-line pattern first (faster for common case)
  const singleLineMatch = EXPORT_PATH_PATTERN.exec(normalized);
  if (singleLineMatch) {
    return singleLineMatch[1];
  }
  // Try multiline pattern (handles newlines within braces)
  const multilineMatch = MULTILINE_EXPORT_PATTERN.exec(normalized);
  return multilineMatch ? multilineMatch[1] : null;
}

/**
 * Normalizes an export path for comparison by stripping file extensions
 * and /index suffixes. This ensures that './foo', './foo.js', './foo/index',
 * and './foo/index.js' are all treated as equivalent paths during deduplication.
 * @param exportPath The path to normalize.
 * @returns The normalized path without extension or /index suffix.
 */
export function normalizeExportPath(exportPath: string): string {
  return exportPath.replace(/\.(js|mjs|ts|tsx|mts|cts)$/, '').replace(/\/index$/, '');
}

/**
 * Extracts all export paths from barrel content and returns them normalized.
 * Paths are normalized by stripping extensions (e.g., ./foo.js → ./foo) and
 * removing /index suffixes (e.g., ./utils/index → ./utils) for consistent
 * comparison during deduplication.
 * @param content The barrel file content.
 * @returns Set of normalized module paths found in export statements.
 */
export function extractAllExportPaths(content: string): Set<string> {
  const paths = new Set<string>();
  const lines = content.trim().split('\n');

  for (const line of lines) {
    const exportPath = extractExportPath(line.trim());
    if (!exportPath) {
      continue;
    }

    // Pre-normalize paths for efficient comparison
    paths.add(normalizeExportPath(exportPath));
  }

  return paths;
}

/**
 * Checks if a line is an export statement.
 * @param line The line to check.
 * @returns True if the line is an export statement.
 */
export function isExportLine(line: string): boolean {
  return line.startsWith("export * from '") || line.startsWith('export {');
}

/**
 * Extracts the extension pattern from an export line.
 * @param line The export line.
 * @returns The extension pattern, or null if none found.
 */
export function extractExtensionFromLine(line: string): string | null {
  if (line.includes('.js')) {
    return '.js';
  }

  if (line.includes('.mjs')) {
    return '.mjs';
  }

  // If we find exports without extensions, return empty string
  if (!/from '[^']*'(\s*;|$)/.exec(line)) {
    return null;
  }

  return '';
}

/**
 * Detects the file extension pattern used in existing barrel content.
 * @param content The barrel file content.
 * @returns The extension pattern used, or null if none detected.
 */
export function detectExtensionFromBarrelContent(content: string): string | null {
  const lines = content.trim().split('\n');

  for (const line of lines) {
    const trimmedLine = line.trim();
    if (!isExportLine(trimmedLine)) {
      continue;
    }

    const extension = extractExtensionFromLine(trimmedLine);
    if (extension !== null) {
      return extension;
    }
  }

  return null;
}

/**
 * Checks if a line closes a multiline export statement.
 * @param line The line to check.
 * @returns True if the line ends a multiline export.
 */
export function isMultilineExportEnd(line: string): boolean {
  return MULTILINE_EXPORT_END.test(line);
}

/**
 * Checks if a line starts a multiline export (opens but doesn't close on same line).
 * @param line The line to check.
 * @returns True if the line starts a multiline export.
 */
export function isMultilineExportStart(line: string): boolean {
  return line.startsWith('export {') && !isMultilineExportEnd(line);
}
