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

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { BarrelContentSanitizer } from '../../../../core/barrel/content-sanitizer.js';

/**
 * Helper function to run sanitizer with given lines and paths.
 * @param lines - Array of strings representing the content lines.
 * @param paths - Array of paths to sanitize.
 * @returns The preserved lines as a single string.
 */
function runSanitize(lines: string[], paths: string[]): string {
  const sanitizer = new BarrelContentSanitizer();
  const existingContent = lines.join('\n');
  const result = sanitizer.preserveDefinitionsAndSanitizeExports(
    existingContent,
    new Set<string>(paths),
  );
  return result.preservedLines.join('\n');
}

describe('BarrelContentSanitizer', () => {
  it('should preserve direct definitions and strip regenerated or external re-exports', () => {
    const preserved = runSanitize(
      [
        "export * from '../external';",
        "export { alpha } from './alpha';",
        'export {',
        '  beta,',
        "} from './beta';",
        '',
        'export const direct = 1;',
      ],
      ['./alpha', './beta'],
    );

    assert.ok(!preserved.includes("export * from '../external';"));
    assert.ok(!preserved.includes("export { alpha } from './alpha';"));
    assert.ok(!preserved.includes("from './beta';"));
    assert.ok(preserved.includes('export const direct = 1;'));
  });

  it('should handle exports with comments containing closing braces', () => {
    const preserved = runSanitize(
      [
        "export { alpha /* comment with } brace */ } from './alpha';",
        "export { beta, gamma } from './module'; // line comment",
        'export {',
        '  delta, // comment with } brace',
        '  epsilon /* another } comment */',
        "} from './complex';",
      ],
      ['./alpha', './complex'],
    );

    // Should strip re-exports that will be regenerated
    assert.ok(!preserved.includes('./alpha'));
    assert.ok(!preserved.includes('./complex'));

    // Should preserve re-exports that won't be regenerated
    assert.ok(preserved.includes('./module'));
  });

  it('should preserve direct function definitions between exports', () => {
    const preserved = runSanitize(
      [
        "export { alpha } from './alpha';",
        '',
        'export function helperFunction() {',
        '  return "helper";',
        '}',
        '',
        "export { beta } from './beta';",
        '',
        'export const CONSTANT = 42;',
      ],
      ['./alpha', './beta'],
    );

    // Should strip re-exports
    assert.ok(!preserved.includes('./alpha'));
    assert.ok(!preserved.includes('./beta'));

    // Should preserve direct definitions
    assert.ok(preserved.includes('export function helperFunction()'));
    assert.ok(preserved.includes('export const CONSTANT = 42'));
  });

  it('should preserve direct class and type definitions', () => {
    const preserved = runSanitize(
      [
        "export * from './types';",
        '',
        'export class CustomError extends Error {',
        '  constructor(message: string) {',
        '    super(message);',
        '  }',
        '}',
        '',
        'export interface LocalInterface {',
        '  id: string;',
        '}',
        '',
        'export type LocalType = string | number;',
        '',
        "export { utilities } from './utils';",
      ],
      ['./types', './utils'],
    );

    // Should strip re-exports
    assert.ok(!preserved.includes("from './types'"));
    assert.ok(!preserved.includes("from './utils'"));

    // Should preserve direct definitions
    assert.ok(preserved.includes('export class CustomError'));
    assert.ok(preserved.includes('export interface LocalInterface'));
    assert.ok(preserved.includes('export type LocalType'));
  });

  it('should handle star exports with comments', () => {
    const preserved = runSanitize(
      [
        "export * from './all'; // re-export everything",
        "export * from './types'; /* all types */",
        '',
        'export const LOCAL = true;',
      ],
      ['./all', './types'],
    );

    // Should strip re-exports
    assert.ok(!preserved.includes('./all'));
    assert.ok(!preserved.includes('./types'));

    // Should preserve local definition
    assert.ok(preserved.includes('export const LOCAL = true'));
  });

  it('should handle complex multiline exports with inline comments', () => {
    const preserved = runSanitize(
      [
        'export {',
        '  alpha, // first item with } in comment',
        '  beta, /* second item */',
        '  gamma /* { nested } braces */',
        "} from './source';",
        '',
        '// This is a standalone comment',
        'export enum Status {',
        '  Active = "active",',
        '  Inactive = "inactive"',
        '}',
      ],
      ['./source'],
    );

    // Should strip re-export
    assert.ok(!preserved.includes('./source'));

    // Should preserve enum definition and comment
    assert.ok(preserved.includes('// This is a standalone comment'));
    assert.ok(preserved.includes('export enum Status'));
  });

  it('should handle empty lines and whitespace correctly', () => {
    const preserved = runSanitize(
      [
        "export { alpha } from './alpha';",
        '',
        '',
        '   ',
        "export { beta } from './beta';",
        '',
        'export const VALUE = 1;',
        '',
      ],
      ['./alpha', './beta'],
    );

    // Should strip re-exports
    assert.ok(!preserved.includes('./alpha'));
    assert.ok(!preserved.includes('./beta'));

    // Should preserve definition
    assert.ok(preserved.includes('export const VALUE = 1'));

    // Empty lines are preserved in the current implementation
  });

  it('should handle exports without semicolons', () => {
    const preserved = runSanitize(
      [
        "export { alpha } from './alpha'",
        "export * from './all'",
        '',
        'export const NO_SEMICOLON = true',
      ],
      ['./alpha', './all'],
    );

    // Should strip re-exports (with or without semicolons)
    assert.ok(!preserved.includes('./alpha'));
    assert.ok(!preserved.includes('./all'));

    // Should preserve definition
    assert.ok(preserved.includes('export const NO_SEMICOLON = true'));
  });

  it('should handle exports without spaces', () => {
    const preserved = runSanitize(
      [
        "export{alpha,beta}from'./compact';",
        "export*from'./star';",
        "export type{Type}from'./type';",
        '',
        'export const LOCAL = true;',
      ],
      ['./compact', './star', './type'],
    );

    // Should strip re-exports without spaces
    assert.ok(!preserved.includes('./compact'));
    assert.ok(!preserved.includes('./star'));
    assert.ok(!preserved.includes('./type'));

    // Should preserve local definition
    assert.ok(preserved.includes('export const LOCAL = true'));
  });
});
