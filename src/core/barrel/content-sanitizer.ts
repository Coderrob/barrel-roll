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
import {
  extractExportPath,
  isMultilineExportEnd,
  isMultilineExportStart,
  normalizeExportPath,
} from './export-patterns.js';

/**
 * State object for tracking multiline export parsing.
 */
interface IMultilineState {
  buffer: string[];
  inMultiline: boolean;
}

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
  constructor(logger?: ILoggerInstance) {
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
    newContentPaths: Set<string>,
  ): ISanitizationResult {
    const lines = existingContent.trim().split('\n');
    const state: IMultilineState = { buffer: [], inMultiline: false };
    const preservedLines: string[] = [];

    for (const line of lines) {
      const result = this.processLineForPreservation(line, state, newContentPaths);
      preservedLines.push(...result);
    }

    // If we ended mid-multiline (malformed), preserve what we have
    preservedLines.push(...state.buffer);

    return { preservedLines };
  }

  /**
   * Processes a single line during barrel content preservation.
   * Manages multiline export state and returns lines to preserve.
   * @param line TODO: describe parameter
   * @param state TODO: describe parameter
   * @param newContentPaths TODO: describe parameter
   * @returns TODO: describe return value
   */
  private processLineForPreservation(
    line: string,
    state: IMultilineState,
    newContentPaths: Set<string>,
  ): string[] {
    const trimmedLine = line.trim();
    if (state.inMultiline) {
      return this.processInMultilineLine(line, trimmedLine, state, newContentPaths);
    }
    if (isMultilineExportStart(trimmedLine)) {
      state.inMultiline = true;
      state.buffer = [line];
      return [];
    }
    return this.processSingleLine(line, trimmedLine, newContentPaths);
  }

  /**
   * Processes a line received while in multiline export state.
   * @param line - The raw line.
   * @param trimmedLine - The trimmed line.
   * @param state - Current multiline state.
   * @param newContentPaths - Set of paths that will be regenerated.
   * @returns Lines to preserve.
   */
  private processInMultilineLine(
    line: string,
    trimmedLine: string,
    state: IMultilineState,
    newContentPaths: Set<string>,
  ): string[] {
    state.buffer.push(line);
    if (isMultilineExportEnd(trimmedLine)) {
      const result = this.processMultilineBlock(state.buffer, newContentPaths);
      state.buffer = [];
      state.inMultiline = false;
      return result;
    }
    return [];
  }

  /**
   * Processes a completed multiline export block and determines if it should be preserved.
   * @returns Lines to preserve (empty array if should be stripped).
   * @param buffer TODO: describe parameter
   * @param newContentPaths TODO: describe parameter
   */
  private processMultilineBlock(buffer: string[], newContentPaths: Set<string>): string[] {
    const fullBlock = buffer.join('\n');
    const exportPath = extractExportPath(fullBlock);
    if (!exportPath) {
      // Failed to parse as export, preserve the lines
      return buffer;
    }
    return this.shouldPreserveReExport(exportPath, newContentPaths) ? buffer : [];
  }

  /**
   * Processes a single line for preservation in barrel content.
   * @returns Lines to preserve (empty array if should be stripped).
   * @param line TODO: describe parameter
   * @param trimmedLine TODO: describe parameter
   * @param newContentPaths TODO: describe parameter
   */
  private processSingleLine(
    line: string,
    trimmedLine: string,
    newContentPaths: Set<string>,
  ): string[] {
    const exportPath = extractExportPath(trimmedLine);
    if (exportPath) {
      return this.shouldPreserveReExport(exportPath, newContentPaths) ? [line] : [];
    }
    // Non-export line: preserve if not empty
    return trimmedLine.length > 0 ? [line] : [];
  }

  /**
   * Determines if a re-export should be preserved.
   * External paths (starting with '..') are never preserved. Re-exports matching
   * paths that will be regenerated are stripped to avoid duplicates.
   * @param exportPath The export path to check.
   * @param normalizedNewPaths Set of pre-normalized paths that will be regenerated.
   * @returns True if the re-export should be preserved.
   */
  private shouldPreserveReExport(exportPath: string, normalizedNewPaths: Set<string>): boolean {
    const isExternal = exportPath.startsWith('..');
    const normalizedPath = normalizeExportPath(exportPath);
    const willBeRegenerated = normalizedNewPaths.has(normalizedPath);
    const shouldPreserve = !isExternal && !willBeRegenerated;

    this.logPreservationDecision(exportPath, normalizedPath, { isExternal, willBeRegenerated });
    return shouldPreserve;
  }

  /**
   * Logs debug information about re-export preservation decisions.
   * @param exportPath TODO: describe parameter
   * @param normalizedPath TODO: describe parameter
   * @param decision TODO: describe parameter
   */
  private logPreservationDecision(
    exportPath: string,
    normalizedPath: string,
    decision: IPreservationDecision,
  ): void {
    if (!this.logger) {
      return;
    }
    this.logger.debug(
      `[SANITIZER] Checking: ${exportPath} → ${normalizedPath} isExternal: ${decision.isExternal} willBeRegenerated: ${decision.willBeRegenerated}`,
    );
    this.logPreservationAction(exportPath, normalizedPath, decision);
  }

  /**
   * Logs the preservation action for a re-export.
   * @param exportPath - The export path.
   * @param normalizedPath - The normalized path.
   * @param decision - The preservation decision.
   */
  private logPreservationAction(
    exportPath: string,
    normalizedPath: string,
    decision: IPreservationDecision,
  ): void {
    const { logger } = this;
    if (!logger) return;
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
