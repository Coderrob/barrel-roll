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
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, it } from 'node:test';

import { ExportParser } from '../../../../core/parser/export.parser.js';

// Tests run from project root via scripts/run-tests.js
const projectRoot = process.cwd();

describe('ExportParser Integration Tests', () => {
  const parser = new ExportParser();

  /** Recursively lists all test files under the given root directory. */
  async function listTestFiles(root: string): Promise<string[]> {
    const entries = await readdir(root, { withFileTypes: true });
    const files = await Promise.all(
      entries.map(async (entry) => {
        const fullPath = join(root, entry.name);
        if (entry.isDirectory()) {
          return listTestFiles(fullPath);
        }
        return entry.name.endsWith('.test.ts') ? [fullPath] : [];
      }),
    );
    return files.flat();
  }

  describe('real-world test files', () => {
    it('should not extract false exports from test suite files', async () => {
      // This test verifies that test files containing export statements
      // inside strings (as test fixtures) don't produce false positives
      const testSuitePath = join(projectRoot, 'src/test/unit');

      let files: string[];
      try {
        files = await listTestFiles(testSuitePath);
      } catch {
        // Skip if directory doesn't exist (e.g., in CI before test setup)
        return;
      }

      for (const filePath of files) {
        const content = await readFile(filePath, 'utf8');
        const exports = parser.extractExports(content);

        // Test files should have no real exports - they only contain test code
        // with export statements inside strings as test fixtures
        assert.deepStrictEqual(
          exports,
          [],
          `${filePath} should have no exports, but found: ${JSON.stringify(exports)}`,
        );
      }
    });

    it('should correctly extract exports from real source files', async () => {
      // Verify the parser works on actual source files
      const parserSourcePath = join(projectRoot, 'src/core/parser/export.parser.ts');
      const content = await readFile(parserSourcePath, 'utf8');
      const exports = parser.extractExports(content);

      // The export.parser.ts file exports ExportParser class
      assert.ok(
        exports.some((e) => e.name === 'ExportParser' && !e.typeOnly),
        'Should find ExportParser export',
      );
    });

    it('should not extract exports from barrel-content.builder.test.ts patterns', async () => {
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
