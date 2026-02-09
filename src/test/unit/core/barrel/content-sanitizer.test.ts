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

describe('BarrelContentSanitizer', () => {
  it('should preserve direct definitions and strip regenerated or external re-exports', () => {
    const sanitizer = new BarrelContentSanitizer();
    const existingContent = [
      "export * from '../external';",
      "export { alpha } from './alpha';",
      'export {',
      '  beta,',
      "} from './beta';",
      '',
      'export const direct = 1;',
    ].join('\n');

    const newContentPaths = new Set<string>(['./alpha', './beta']);

    const result = sanitizer.preserveDefinitionsAndSanitizeExports(
      existingContent,
      newContentPaths,
    );

    const preserved = result.preservedLines.join('\n');

    assert.ok(!preserved.includes("export * from '../external';"));
    assert.ok(!preserved.includes("export { alpha } from './alpha';"));
    assert.ok(!preserved.includes("from './beta';"));
    assert.ok(preserved.includes('export const direct = 1;'));
  });
  it('should handle exports with comments containing closing braces', () => {
    const sanitizer = new BarrelContentSanitizer();
    const existingContent = [
      "export { alpha /* comment with } brace */ } from './alpha';",
      "export { beta, gamma } from './module'; // line comment",
      'export {',
      '  delta, // comment with } brace',
      '  epsilon /* another } comment */',
      "} from './complex';",
    ].join('\n');

    const newContentPaths = new Set<string>(['./alpha', './complex']);

    const result = sanitizer.preserveDefinitionsAndSanitizeExports(
      existingContent,
      newContentPaths,
    );

    const preserved = result.preservedLines.join('\n');

    // Should strip re-exports that will be regenerated
    assert.ok(!preserved.includes('./alpha'));
    assert.ok(!preserved.includes('./complex'));

    // Should preserve re-exports that won't be regenerated
    assert.ok(preserved.includes('./module'));
  });

  it('should preserve direct function definitions between exports', () => {
    const sanitizer = new BarrelContentSanitizer();
    const existingContent = [
      "export { alpha } from './alpha';",
      '',
      'export function helperFunction() {',
      '  return "helper";',
      '}',
      '',
      "export { beta } from './beta';",
      '',
      'export const CONSTANT = 42;',
    ].join('\n');

    const newContentPaths = new Set<string>(['./alpha', './beta']);

    const result = sanitizer.preserveDefinitionsAndSanitizeExports(
      existingContent,
      newContentPaths,
    );

    const preserved = result.preservedLines.join('\n');

    // Should strip re-exports
    assert.ok(!preserved.includes('./alpha'));
    assert.ok(!preserved.includes('./beta'));

    // Should preserve direct definitions
    assert.ok(preserved.includes('export function helperFunction()'));
    assert.ok(preserved.includes('export const CONSTANT = 42'));
  });

  it('should preserve direct class and type definitions', () => {
    const sanitizer = new BarrelContentSanitizer();
    const existingContent = [
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
    ].join('\n');

    const newContentPaths = new Set<string>(['./types', './utils']);

    const result = sanitizer.preserveDefinitionsAndSanitizeExports(
      existingContent,
      newContentPaths,
    );

    const preserved = result.preservedLines.join('\n');

    // Should strip re-exports
    assert.ok(!preserved.includes("from './types'"));
    assert.ok(!preserved.includes("from './utils'"));

    // Should preserve direct definitions
    assert.ok(preserved.includes('export class CustomError'));
    assert.ok(preserved.includes('export interface LocalInterface'));
    assert.ok(preserved.includes('export type LocalType'));
  });

  it('should handle star exports with comments', () => {
    const sanitizer = new BarrelContentSanitizer();
    const existingContent = [
      "export * from './all'; // re-export everything",
      "export * from './types'; /* all types */",
      '',
      'export const LOCAL = true;',
    ].join('\n');

    const newContentPaths = new Set<string>(['./all', './types']);

    const result = sanitizer.preserveDefinitionsAndSanitizeExports(
      existingContent,
      newContentPaths,
    );

    const preserved = result.preservedLines.join('\n');

    // Should strip re-exports
    assert.ok(!preserved.includes('./all'));
    assert.ok(!preserved.includes('./types'));

    // Should preserve local definition
    assert.ok(preserved.includes('export const LOCAL = true'));
  });

  it('should handle complex multiline exports with inline comments', () => {
    const sanitizer = new BarrelContentSanitizer();
    const existingContent = [
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
    ].join('\n');

    const newContentPaths = new Set<string>(['./source']);

    const result = sanitizer.preserveDefinitionsAndSanitizeExports(
      existingContent,
      newContentPaths,
    );

    const preserved = result.preservedLines.join('\n');

    // Should strip re-export
    assert.ok(!preserved.includes('./source'));

    // Should preserve enum definition and comment
    assert.ok(preserved.includes('// This is a standalone comment'));
    assert.ok(preserved.includes('export enum Status'));
  });

  it('should handle empty lines and whitespace correctly', () => {
    const sanitizer = new BarrelContentSanitizer();
    const existingContent = [
      "export { alpha } from './alpha';",
      '',
      '',
      '   ',
      "export { beta } from './beta';",
      '',
      'export const VALUE = 1;',
      '',
    ].join('\n');

    const newContentPaths = new Set<string>(['./alpha', './beta']);

    const result = sanitizer.preserveDefinitionsAndSanitizeExports(
      existingContent,
      newContentPaths,
    );

    const preserved = result.preservedLines.join('\n');

    // Should strip re-exports
    assert.ok(!preserved.includes('./alpha'));
    assert.ok(!preserved.includes('./beta'));

    // Should preserve definition
    assert.ok(preserved.includes('export const VALUE = 1'));

    // Empty lines are preserved in the current implementation
  });

  it('should handle exports without semicolons', () => {
    const sanitizer = new BarrelContentSanitizer();
    const existingContent = [
      "export { alpha } from './alpha'",
      "export * from './all'",
      '',
      'export const NO_SEMICOLON = true',
    ].join('\n');

    const newContentPaths = new Set<string>(['./alpha', './all']);

    const result = sanitizer.preserveDefinitionsAndSanitizeExports(
      existingContent,
      newContentPaths,
    );

    const preserved = result.preservedLines.join('\n');

    // Should strip re-exports (with or without semicolons)
    assert.ok(!preserved.includes('./alpha'));
    assert.ok(!preserved.includes('./all'));

    // Should preserve definition
    assert.ok(preserved.includes('export const NO_SEMICOLON = true'));
  });

  it('should handle exports without spaces', () => {
    const sanitizer = new BarrelContentSanitizer();
    const existingContent = [
      "export{alpha,beta}from'./compact';",
      "export*from'./star';",
      "export type{Type}from'./type';",
      '',
      'export const LOCAL = true;',
    ].join('\n');

    const newContentPaths = new Set<string>(['./compact', './star', './type']);

    const result = sanitizer.preserveDefinitionsAndSanitizeExports(
      existingContent,
      newContentPaths,
    );

    const preserved = result.preservedLines.join('\n');

    // Should strip re-exports without spaces
    assert.ok(!preserved.includes('./compact'));
    assert.ok(!preserved.includes('./star'));
    assert.ok(!preserved.includes('./type'));

    // Should preserve local definition
    assert.ok(preserved.includes('export const LOCAL = true'));
  });
});
