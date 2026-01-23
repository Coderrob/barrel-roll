import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, it } from 'node:test';

import { ExportParser } from './export.parser.js';

// Tests run from project root via scripts/run-tests.js
const projectRoot = process.cwd();

describe('ExportParser Integration', () => {
  const parser = new ExportParser();

  describe('real-world test files', () => {
    it('should not extract false exports from test suite files', async () => {
      // This test verifies that test files containing export statements
      // inside strings (as test fixtures) don't produce false positives
      const testSuitePath = join(projectRoot, 'src/test/suite');

      let files: string[];
      try {
        files = await readdir(testSuitePath);
      } catch {
        // Skip if directory doesn't exist (e.g., in CI before test setup)
        return;
      }

      const testFiles = files.filter((f) => f.endsWith('.test.ts'));

      for (const file of testFiles) {
        const filePath = join(testSuitePath, file);
        const content = await readFile(filePath, 'utf8');
        const exports = parser.extractExports(content);

        // Test files should have no real exports - they only contain test code
        // with export statements inside strings as test fixtures
        assert.deepStrictEqual(
          exports,
          [],
          `${file} should have no exports, but found: ${JSON.stringify(exports)}`,
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
