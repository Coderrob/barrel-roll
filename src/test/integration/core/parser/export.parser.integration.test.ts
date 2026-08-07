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

import { ExportParser } from '../../../../core/parser/export.parser.js';

describe('ExportParser Integration Tests', () => {
  const parser = new ExportParser();

  describe('real-world test files', () => {
    it('should not extract false exports from representative test-suite markup', () => {
      const source = String.raw`
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

describe('fixture', () => {
  it('contains export examples', () => {
    const line = "export { Named } from './named';";
    const multiline = "export { Alpha, Beta } from './values';";
    // export class CommentedOut {}
    assert.ok(line && multiline);
  });
});
`;

      assert.deepStrictEqual(parser.extractExports(source), []);
    });

    it('should correctly extract exports from representative production source', () => {
      const source = `
export interface ParserOptions { allowJavaScript: boolean }
export class ExportParserFixture {}
const internal = true;
`;
      const exports = parser.extractExports(source);

      assert.ok(
        exports.some((entry) => entry.name === 'ExportParserFixture' && !entry.typeOnly),
        'Should find the exported class',
      );
      assert.ok(exports.some((entry) => entry.name === 'ParserOptions' && entry.typeOnly));
      assert.ok(!exports.some((entry) => entry.name === 'internal'));
    });

    it('should not extract exports from barrel-content.builder.test.ts patterns', () => {
      // Simulates the exact pattern that caused the original bug
      const source = String.raw`
import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';

describe('BarrelContentBuilder Test Suite', () => {
  it('should build content for single file with multiple exports', () => {
    const exportsByFile = new Map([['myFile.ts', ['MyClass', 'MyInterface', 'myConst']]]);
    const content = builder.buildContent(exportsByFile, '/some/path');

    assert.strictEqual(content, "export { MyClass, MyInterface, myConst } from './myFile';\n");
  });

  it('should build content for multiple files', () => {
    const exportsByFile = new Map([
      ['fileA.ts', ['ClassA']],
      ['fileB.ts', ['ClassB']],
    ]);
    const content = builder.buildContent(exportsByFile, '/some/path');
    assert.ok(content.includes("export { ClassA } from './fileA';"));
    assert.ok(content.includes("export { ClassB } from './fileB';"));
  });

  it('should handle default exports', () => {
    const exportsByFile = new Map([['myFile.ts', ['default']]]);
    const content = builder.buildContent(exportsByFile, '/some/path');

    assert.strictEqual(content, "export { default } from './myFile';\n");
  });
});
`;

      const exports = parser.extractExports(source);

      // None of MyClass, MyInterface, myConst, ClassA, ClassB, default should be extracted
      assert.deepStrictEqual(
        exports,
        [],
        `Should have no exports from test fixture strings, but found: ${JSON.stringify(exports)}`,
      );
    });
  });
});
