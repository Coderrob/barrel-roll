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

import {
  detectExtensionFromBarrelContent,
  extractAllExportPaths,
  extractExtensionFromLine,
  extractExportPath,
} from '../../../../core/barrel/export-patterns.js';

describe('Export Path Utils', () => {
  it('should extract export paths from single and multiline exports', () => {
    const single = "export { alpha } from './alpha';";
    const multiline = `export {
  alpha,
  beta,
} from './beta';`;

    assert.strictEqual(extractExportPath(single), './alpha');
    assert.strictEqual(extractExportPath(multiline), './beta');
  });

  it('should extract and normalize all export paths', () => {
    const content = [
      "export * from './alpha.js';",
      "export { beta } from './beta/index';",
      'const ignore = true;',
      '',
    ].join('\n');

    const paths = extractAllExportPaths(content);

    assert.strictEqual(paths.has('./alpha'), true);
    assert.strictEqual(paths.has('./beta'), true);
    assert.strictEqual(paths.size, 2);
  });

  it('should detect extension patterns from barrel content', () => {
    assert.strictEqual(detectExtensionFromBarrelContent('const a = 1;'), null);

    const jsContent = "export { alpha } from './alpha.js';";
    assert.strictEqual(detectExtensionFromBarrelContent(jsContent), '.js');

    const mjsContent = "export { alpha } from './alpha.mjs';";
    assert.strictEqual(detectExtensionFromBarrelContent(mjsContent), '.mjs');

    const noExtContent = "export { alpha } from './alpha';";
    assert.strictEqual(detectExtensionFromBarrelContent(noExtContent), '');
  });

  it('should return null for extension checks on non-export lines', () => {
    assert.strictEqual(extractExtensionFromLine('const alpha = 1;'), null);
  });

  it('should extract export paths from exports containing comments', () => {
    // Single-line export with block comment containing closing brace
    const withBlockComment = "export { alpha /* some } comment */ } from './alpha';";
    assert.strictEqual(extractExportPath(withBlockComment), './alpha');

    // Single-line export with line comment
    const withLineComment = "export { alpha, beta } from './module'; // comment";
    assert.strictEqual(extractExportPath(withLineComment), './module');

    // Multiline export with comments
    const multilineWithComments = `export {
  alpha, // comment with } brace
  beta /* another } comment */
} from './complex';`;
    assert.strictEqual(extractExportPath(multilineWithComments), './complex');

    // Export with nested comment braces
    const nestedBraces = "export { foo /* { nested } braces */ } from './foo';";
    assert.strictEqual(extractExportPath(nestedBraces), './foo');
  });

  it('should handle star exports with comments', () => {
    const starWithLineComment = "export * from './all'; // re-export all";
    assert.strictEqual(extractExportPath(starWithLineComment), './all');

    const starWithBlockComment = "export * /* everything */ from './everything';";
    assert.strictEqual(extractExportPath(starWithBlockComment), './everything');

    const starNoComment = "export * from './plain';";
    assert.strictEqual(extractExportPath(starNoComment), './plain');
  });

  it('should handle exports without semicolons', () => {
    const noSemicolon = "export { alpha } from './alpha'";
    assert.strictEqual(extractExportPath(noSemicolon), './alpha');

    const noSemicolonWithComment = "export { beta } from './beta' // no semicolon";
    assert.strictEqual(extractExportPath(noSemicolonWithComment), './beta');

    const starNoSemicolon = "export * from './star'";
    assert.strictEqual(extractExportPath(starNoSemicolon), './star');
  });

  it('should handle exports with multiple comments', () => {
    const multipleComments =
      "export { alpha /* c1 */, beta /* c2 */ } from './multi'; // end comment";
    assert.strictEqual(extractExportPath(multipleComments), './multi');

    const manyBraces = "export { foo /* }} } {{ */ } from './braces';";
    assert.strictEqual(extractExportPath(manyBraces), './braces');
  });

  it('should handle exports with varied whitespace', () => {
    const extraSpaces = "export    {    alpha    }    from    './spaces'   ;";
    assert.strictEqual(extractExportPath(extraSpaces), './spaces');

    const tabs = "export\t{\talpha\t}\tfrom\t'./tabs';";
    assert.strictEqual(extractExportPath(tabs), './tabs');

    const mixed = "export  { alpha }  from './mixed'  ;  // comment";
    assert.strictEqual(extractExportPath(mixed), './mixed');
  });

  it('should handle type-only exports', () => {
    const typeOnly = "export type { Alpha, Beta } from './types';";
    assert.strictEqual(extractExportPath(typeOnly), './types');

    const typeOnlyWithComment = "export type { Gamma } from './gamma'; // types only";
    assert.strictEqual(extractExportPath(typeOnlyWithComment), './gamma');
  });

  it('should handle multiline exports with comments on each line', () => {
    const complexMultiline = `export {
  // First item
  alpha, // inline comment with }
  /* Block comment
     spanning lines with } */ beta,
  gamma /* another } */
} from './complex-multiline';`;
    assert.strictEqual(extractExportPath(complexMultiline), './complex-multiline');
  });

  it('should handle edge cases', () => {
    // Empty braces
    const emptyBraces = "export { } from './empty';";
    assert.strictEqual(extractExportPath(emptyBraces), './empty');

    // Just whitespace in braces
    const whitespaceOnly = "export {   } from './whitespace';";
    assert.strictEqual(extractExportPath(whitespaceOnly), './whitespace');

    // Single export
    const singleExport = "export { single } from './single';";
    assert.strictEqual(extractExportPath(singleExport), './single');
  });

  it('should handle exports without spaces', () => {
    // Export without space after export keyword
    const noSpace = "export{alpha}from'./nospace';";
    assert.strictEqual(extractExportPath(noSpace), './nospace');

    // Star export without space
    const starNoSpace = "export*from'./star';";
    assert.strictEqual(extractExportPath(starNoSpace), './star');

    // Type export without space before brace
    const typeNoSpace = "export type{Alpha}from'./type';";
    assert.strictEqual(extractExportPath(typeNoSpace), './type');

    // Mixed spaces
    const mixedSpaces = "export{ alpha, beta }from './mixed';";
    assert.strictEqual(extractExportPath(mixedSpaces), './mixed');
  });

  it('should return null for invalid export statements', () => {
    // Missing 'from' keyword
    assert.strictEqual(extractExportPath('export { alpha };'), null);

    // Missing closing brace
    assert.strictEqual(extractExportPath("export { alpha from './alpha';"), null);

    // Missing quotes
    assert.strictEqual(extractExportPath('export { alpha } from ./alpha;'), null);

    // Not an export statement
    assert.strictEqual(extractExportPath('const alpha = 1;'), null);

    // Empty string
    assert.strictEqual(extractExportPath(''), null);
  });

  it('should handle double-quoted paths if they exist', () => {
    // Note: Current implementation only supports single quotes
    // This test documents expected behavior
    const doubleQuoted = 'export { alpha } from "./path";';
    // Implementation now supports both single and double quotes
    assert.strictEqual(extractExportPath(doubleQuoted), './path');
  });
});
