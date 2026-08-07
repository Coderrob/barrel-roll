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

import type { ILoggerInstance } from '../../types/index.js';
import { findBarrelReExports, normalizeExportPath } from './export-patterns.js';

const BLOCK_COMMENT_END = '*/';
const BLOCK_COMMENT_START = '/*';

/**
 * Result of content sanitization.
 */
export interface ISanitizationResult {
  preservedLines: string[];
}

interface IPreservationDecision {
  isExternal: boolean;
  willBeRegenerated: boolean;
}

/**
 * Service for sanitizing barrel file content during updates.
 * Handles both single-line and multiline export statements.
 */
export class BarrelContentSanitizer {
  private readonly logger?: ILoggerInstance;

  /**
   * Creates a new BarrelContentSanitizer instance.
   * @param logger Optional logger for debug output.
   */
  constructor(logger?: Readonly<ILoggerInstance>) {
    this.logger = logger;
  }

  /**
   * Preserves direct definitions and sanitizes re-exports from existing barrel content.
   * Handles both single-line and multiline export statements.
   * @param existingContent The existing barrel file content.
   * @param newContentPaths Set of module paths that will be regenerated (to avoid duplicates).
   * @returns Object containing preserved lines.
   */
  preserveDefinitionsAndSanitizeExports(
    existingContent: string,
    newContentPaths: ReadonlySet<string>,
  ): ISanitizationResult {
    const ranges = findBarrelReExports(existingContent)
      .filter((declaration) => !this.shouldPreserveReExport(declaration.path, newContentPaths))
      .map((declaration) => ({
        end: this.includeAttachedTrailingComment(existingContent, declaration.end),
        start: declaration.start,
      }));
    let cursor = 0;
    const fragments: string[] = [];
    for (const range of ranges) {
      fragments.push(existingContent.slice(cursor, range.start));
      cursor = range.end;
    }
    fragments.push(existingContent.slice(cursor));

    const preservedLines = fragments
      .join('')
      .split(/\r?\n/)
      .filter((line) => line.trim().length > 0);
    return { preservedLines };
  }

  /**
   * Includes a comment trailing a removed re-export on the same line. Standalone comments before
   * a declaration remain untouched, while comments attached to a generated line do not become
   * misleading orphaned markup.
   * @param content Complete source text.
   * @param declarationEnd End offset of the export declaration.
   * @returns End offset including an attached trailing comment when present.
   */
  private includeAttachedTrailingComment(content: string, declarationEnd: number): number {
    const lineEndIndex = content.indexOf('\n', declarationEnd);
    const lineEnd = lineEndIndex === -1 ? content.length : lineEndIndex;
    const suffix = content.slice(declarationEnd, lineEnd);
    const trimmedSuffix = suffix.trimStart();
    if (trimmedSuffix.length === 0) {
      return lineEnd;
    }
    if (trimmedSuffix.startsWith('//')) {
      return lineEnd;
    }
    if (!trimmedSuffix.startsWith(BLOCK_COMMENT_START)) {
      return declarationEnd;
    }
    return this.findBlockCommentEnd(content, declarationEnd);
  }

  /**
   * Finds the end of an attached block comment.
   * @param content Complete source text.
   * @param searchStart Offset at which to start searching.
   * @returns Offset after the block comment, or the content end for an unterminated comment.
   */
  private findBlockCommentEnd(content: string, searchStart: number): number {
    const commentStart = content.indexOf(BLOCK_COMMENT_START, searchStart);
    const commentEnd = content.indexOf(
      BLOCK_COMMENT_END,
      commentStart + BLOCK_COMMENT_START.length,
    );
    return commentEnd === -1 ? content.length : commentEnd + BLOCK_COMMENT_END.length;
  }

  /**
   * Determines if a re-export should be preserved.
   * External paths (starting with '..') are never preserved. Re-exports matching
   * paths that will be regenerated are stripped to avoid duplicates.
   * @param exportPath The export path to check.
   * @param normalizedNewPaths Set of pre-normalized paths that will be regenerated.
   * @returns True if the re-export should be preserved.
   */
  private shouldPreserveReExport(
    exportPath: string,
    normalizedNewPaths: ReadonlySet<string>,
  ): boolean {
    const isExternal = /^(?:\.\.(?:[\\/]|$))/.test(exportPath);
    const normalizedPath = normalizeExportPath(exportPath);
    const willBeRegenerated = normalizedNewPaths.has(normalizedPath);
    const shouldPreserve = !isExternal && !willBeRegenerated;

    this.logPreservationDecision(exportPath, normalizedPath, { isExternal, willBeRegenerated });
    return shouldPreserve;
  }

  /**
   * Logs debug information about re-export preservation decisions.
   * @param exportPath Module path as written in the barrel.
   * @param normalizedPath Canonical path used for duplicate comparison.
   * @param decision Reason the re-export is preserved or removed.
   */
  private logPreservationDecision(
    exportPath: string,
    normalizedPath: string,
    decision: Readonly<IPreservationDecision>,
  ): void {
    if (!this.logger) {
      return;
    }
    this.logger.debug(
      `[SANITIZER] Checking: ${exportPath} → ${normalizedPath} isExternal: ${decision.isExternal} willBeRegenerated: ${decision.willBeRegenerated}`,
    );
    this.logPreservationAction(this.logger, exportPath, normalizedPath, decision);
  }

  /**
   * Logs the preservation action for a re-export.
   * @param logger Logger receiving the decision.
   * @param exportPath - The export path.
   * @param normalizedPath - The normalized path.
   * @param decision - The preservation decision.
   */
  private logPreservationAction(
    logger: Readonly<ILoggerInstance>,
    exportPath: string,
    normalizedPath: string,
    decision: Readonly<IPreservationDecision>,
  ): void {
    if (decision.isExternal) {
      logger.debug(`Stripping external re-export: ${exportPath}`);
    } else if (decision.willBeRegenerated) {
      logger.debug(
        `Stripping re-export that will be regenerated: ${exportPath} (normalized: ${normalizedPath})`,
      );
    } else {
      logger.debug(`Preserving re-export: ${exportPath}`);
    }
  }
}
