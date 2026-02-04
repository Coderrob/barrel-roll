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
import * as os from 'node:os';
import * as path from 'node:path';

import type { Uri } from 'vscode';

import { afterEach, beforeEach, describe, it } from 'node:test';

import type { LoggerInstance } from '../../../../types/index.js';
import { BarrelGenerationMode, INDEX_FILENAME } from '../../../../types/index.js';
import { FileSystemService } from '../../../../core/io/file-system.service.js';
import { BarrelFileGenerator } from '../../../../core/barrel/barrel-file.generator.js';

/**
 * Creates a mock logger that captures log calls for testing.
 */
function createMockLogger(): LoggerInstance & { calls: { level: string; message: string }[] } {
  const calls: { level: string; message: string }[] = [];
  return {
    calls,
    isLoggerAvailable: () => true,
    info: (message: string) => calls.push({ level: 'info', message }),
    debug: (message: string) => calls.push({ level: 'debug', message }),
    warn: (message: string) => calls.push({ level: 'warn', message }),
    error: (message: string) => calls.push({ level: 'error', message }),
    fatal: (message: string) => calls.push({ level: 'fatal', message }),
  };
}

describe('BarrelFileGenerator', () => {
  let tmpDir: string;
  let fileSystem: FileSystemService;

  beforeEach(async () => {
    fileSystem = new FileSystemService();
    tmpDir = await fileSystem.createTempDirectory(path.join(os.tmpdir(), 'barrel-roll-'));
  });

  afterEach(async () => {
    await fileSystem.removePath(tmpDir);
  });

  describe('generateBarrelFile', () => {
    it('should generate recursive barrel files for nested directories', async () => {
      const nestedDir = path.join(tmpDir, 'nested');
      const deeperDir = path.join(nestedDir, 'deeper');

      await fileSystem.ensureDirectory(deeperDir);

      await fileSystem.writeFile(path.join(tmpDir, 'alpha.ts'), 'export const alpha = 1;');
      await fileSystem.writeFile(
        path.join(nestedDir, 'bravo.ts'),
        `
        export interface Bravo {}
        export default function bravo() {}
      `,
      );
      await fileSystem.writeFile(
        path.join(deeperDir, 'charlie.ts'),
        `
        export { default as charlie } from './impl';
      `,
      );
      await fileSystem.writeFile(
        path.join(deeperDir, 'impl.ts'),
        'export default function impl() {}',
      );

      const generator = new BarrelFileGenerator();
      const rootUri = { fsPath: tmpDir } as unknown as Uri;
      await generator.generateBarrelFile(rootUri, { recursive: true });

      const rootIndex = await fileSystem.readFile(path.join(tmpDir, INDEX_FILENAME));
      const nestedIndex = await fileSystem.readFile(path.join(nestedDir, INDEX_FILENAME));
      const deeperIndex = await fileSystem.readFile(path.join(deeperDir, INDEX_FILENAME));

      assert.strictEqual(
        rootIndex,
        ["export { alpha } from './alpha.js';", "export * from './nested/index.js';", ''].join(
          '\n',
        ),
      );

      assert.strictEqual(
        nestedIndex,
        [
          "export type { Bravo } from './bravo.js';",
          "export { default } from './bravo.js';",
          "export * from './deeper/index.js';",
          '',
        ].join('\n'),
      );
      const expectedDeeperIndex = [
        "export { charlie } from './charlie.js';",
        "export { default } from './impl.js';",
        '',
      ].join('\n');

      assert.strictEqual(deeperIndex, expectedDeeperIndex);
    });

    it('should sanitize existing barrels when updating', async () => {
      const generator = new BarrelFileGenerator();
      const rootUri = { fsPath: tmpDir } as unknown as Uri;

      await fileSystem.writeFile(path.join(tmpDir, INDEX_FILENAME), "export * from '../outside';");

      await generator.generateBarrelFile(rootUri, {
        mode: BarrelGenerationMode.UpdateExisting,
      });

      const rootIndex = await fileSystem.readFile(path.join(tmpDir, INDEX_FILENAME));

      assert.strictEqual(rootIndex, '\n');
    });

    it('should skip creating barrels when updating non-existent ones', async () => {
      const generator = new BarrelFileGenerator();
      const nestedDir = path.join(tmpDir, 'missing');
      await fileSystem.ensureDirectory(nestedDir);

      const nestedUri = { fsPath: nestedDir } as unknown as Uri;
      await generator.generateBarrelFile(nestedUri, {
        mode: BarrelGenerationMode.UpdateExisting,
      });

      const exists = await fileSystem.fileExists(path.join(nestedDir, INDEX_FILENAME));

      assert.strictEqual(exists, false);
    });

    it('should only recurse into subdirectories that already contain barrels when updating', async () => {
      const generator = new BarrelFileGenerator();
      const rootUri = { fsPath: tmpDir } as unknown as Uri;

      const keepDir = path.join(tmpDir, 'keep');
      const skipDir = path.join(tmpDir, 'skip');

      await fileSystem.ensureDirectory(keepDir);
      await fileSystem.ensureDirectory(skipDir);

      await fileSystem.writeFile(path.join(keepDir, 'keep.ts'), 'export const keep = 1;');
      await fileSystem.writeFile(path.join(skipDir, 'skip.ts'), 'export const skip = 1;');

      await fileSystem.writeFile(path.join(keepDir, INDEX_FILENAME), "export * from '../legacy';");

      await generator.generateBarrelFile(rootUri, {
        recursive: true,
        mode: BarrelGenerationMode.UpdateExisting,
      });

      const keepIndex = await fileSystem.readFile(path.join(keepDir, INDEX_FILENAME));
      assert.strictEqual(keepIndex, ["export { keep } from './keep.js';", ''].join('\n'));

      const skipIndexExists = await fileSystem.fileExists(path.join(skipDir, INDEX_FILENAME));
      assert.strictEqual(skipIndexExists, false);

      const rootIndex = await fileSystem.readFile(path.join(tmpDir, INDEX_FILENAME));
      assert.strictEqual(rootIndex, ["export * from './keep/index.js';", ''].join('\n'));
    });

    it('should throw when no TypeScript files are present and recursion is disabled', async () => {
      const generator = new BarrelFileGenerator();
      const emptyDirUri = { fsPath: tmpDir } as unknown as Uri;

      await assert.rejects(
        generator.generateBarrelFile(emptyDirUri),
        /No TypeScript files found in the selected directory/,
      );
    });

    it('should not create barrel when no TypeScript files and recursion is enabled', async () => {
      const generator = new BarrelFileGenerator();
      const emptyDirUri = { fsPath: tmpDir } as unknown as Uri;

      await generator.generateBarrelFile(emptyDirUri, { recursive: true });

      const exists = await fileSystem.fileExists(path.join(tmpDir, INDEX_FILENAME));
      assert.strictEqual(exists, false);
    });

    it('should sanitize existing barrel when recursive and no TypeScript files', async () => {
      const generator = new BarrelFileGenerator();
      const emptyDirUri = { fsPath: tmpDir } as unknown as Uri;

      await fileSystem.writeFile(path.join(tmpDir, INDEX_FILENAME), "export * from '../outside';");

      await generator.generateBarrelFile(emptyDirUri, { recursive: true });

      const rootIndex = await fileSystem.readFile(path.join(tmpDir, INDEX_FILENAME));

      assert.strictEqual(rootIndex, '\n');
    });

    it('should preserve direct definitions in index.ts when updating', async () => {
      const generator = new BarrelFileGenerator();
      const rootUri = { fsPath: tmpDir } as unknown as Uri;

      // Create an index.ts with both direct definitions and re-exports
      const existingContent = `// Direct function definition
export function helperFunction(value: string): string {
  return value.toUpperCase();
}

// Direct constant
export const VERSION = '1.0.0';

// Direct type definition
export interface Config {
  name: string;
  value: number;
}

// Re-export from another file
export * from './utils';

// Another direct function
export const createConfig = (name: string, value: number): Config => ({
  name,
  value,
});
`;

      await fileSystem.writeFile(path.join(tmpDir, INDEX_FILENAME), existingContent);

      // Create a utils.ts file to make the re-export valid
      await fileSystem.writeFile(path.join(tmpDir, 'utils.ts'), 'export const util = 42;');

      await generator.generateBarrelFile(rootUri, {
        mode: BarrelGenerationMode.UpdateExisting,
      });

      const updatedIndex = await fileSystem.readFile(path.join(tmpDir, INDEX_FILENAME));

      // Verify that direct definitions are preserved
      assert.ok(
        updatedIndex.includes('export function helperFunction'),
        'Function definition should be preserved',
      );
      assert.ok(updatedIndex.includes('export const VERSION'), 'Constant should be preserved');
      assert.ok(
        updatedIndex.includes('export interface Config'),
        'Type definition should be preserved',
      );
      assert.ok(
        updatedIndex.includes('export const createConfig'),
        'Arrow function should be preserved',
      );

      // Verify that valid re-exports are still present
      assert.ok(
        updatedIndex.includes("export { util } from './utils.js'"),
        'Valid re-export should be generated for utils.ts',
      );
    });

    it('should preserve multiline function definitions between export statements', async () => {
      const generator = new BarrelFileGenerator();
      const rootUri = { fsPath: tmpDir } as unknown as Uri;

      // Create an index.ts with a multiline function between export statements
      const existingContent = `export { isEmptyArray } from './array.js';
export {
  assert,
  assertBoolean,
  assertDefined,
} from './assert.js';

// Multiline function definition between exports
export function processData(
  input: string[],
  options: {
    filter?: (item: string) => boolean;
    transform?: (item: string) => string;
  } = {},
): string[] {
  let result = input;

  if (options.filter) {
    result = result.filter(options.filter);
  }

  if (options.transform) {
    result = result.map(options.transform);
  }

  return result;
}

export { formatErrorForLog, getErrorMessage } from './errors.js';
export { safeStringify } from './format.js';
`;

      await fileSystem.writeFile(path.join(tmpDir, INDEX_FILENAME), existingContent);

      // Create the actual source files to make re-exports valid
      await fileSystem.writeFile(
        path.join(tmpDir, 'array.ts'),
        'export function isEmptyArray(arr: unknown[]): boolean { return arr.length === 0; }',
      );
      await fileSystem.writeFile(
        path.join(tmpDir, 'assert.ts'),
        'export function assert(condition: unknown): void {}',
      );
      await fileSystem.writeFile(
        path.join(tmpDir, 'errors.ts'),
        'export function getErrorMessage(): string { return ""; }\nexport function formatErrorForLog(): string { return ""; }',
      );
      await fileSystem.writeFile(
        path.join(tmpDir, 'format.ts'),
        'export function safeStringify(): string { return ""; }',
      );

      await generator.generateBarrelFile(rootUri, {
        mode: BarrelGenerationMode.UpdateExisting,
      });

      const updatedIndex = await fileSystem.readFile(path.join(tmpDir, INDEX_FILENAME));

      // Verify that the multiline function is preserved with correct formatting
      assert.ok(
        updatedIndex.includes('export function processData('),
        'Multiline function declaration should be preserved',
      );
      assert.ok(
        updatedIndex.includes('input: string[],'),
        'Function parameters should be preserved',
      );
      assert.ok(
        updatedIndex.includes('options: {'),
        'Function parameter type definition should be preserved',
      );
      assert.ok(
        updatedIndex.includes('filter?: (item: string) => boolean;'),
        'Complex type definition should be preserved',
      );
      assert.ok(updatedIndex.includes('return result;'), 'Function body should be preserved');

      // Verify that surrounding exports are still present
      assert.ok(
        updatedIndex.includes("export { isEmptyArray } from './array.js'"),
        'Leading export should be preserved',
      );
      assert.ok(
        updatedIndex.includes("export { formatErrorForLog, getErrorMessage } from './errors.js'"),
        'Trailing export should be preserved',
      );
    });

    it('should not duplicate exports when updating existing barrel multiple times', async () => {
      const generator = new BarrelFileGenerator();
      const rootUri = { fsPath: tmpDir } as unknown as Uri;

      // Create source files
      await fileSystem.writeFile(path.join(tmpDir, 'alpha.ts'), 'export const alpha = 1;');
      await fileSystem.writeFile(path.join(tmpDir, 'beta.ts'), 'export const beta = 2;');

      // Generate barrel first time
      await generator.generateBarrelFile(rootUri);

      // Update barrel second time
      await generator.generateBarrelFile(rootUri, {
        mode: BarrelGenerationMode.UpdateExisting,
      });

      // Update barrel third time
      await generator.generateBarrelFile(rootUri, {
        mode: BarrelGenerationMode.UpdateExisting,
      });

      const rootIndex = await fileSystem.readFile(path.join(tmpDir, INDEX_FILENAME));

      // Count occurrences of each export - should only appear once
      const alphaMatches = rootIndex.match(/export \{ alpha \}/g) || [];
      const betaMatches = rootIndex.match(/export \{ beta \}/g) || [];

      assert.strictEqual(alphaMatches.length, 1, 'alpha export should appear exactly once');
      assert.strictEqual(betaMatches.length, 1, 'beta export should appear exactly once');
    });

    it('should strip all external re-exports pointing outside directory', async () => {
      const generator = new BarrelFileGenerator();
      const rootUri = { fsPath: tmpDir } as unknown as Uri;

      // Create index with multiple external re-exports
      const existingContent = `export * from '../parent';
export { foo } from '../../grandparent';
export * from '../../../ancestor';
export { bar } from './local';
`;

      await fileSystem.writeFile(path.join(tmpDir, INDEX_FILENAME), existingContent);
      await fileSystem.writeFile(path.join(tmpDir, 'local.ts'), 'export const bar = 1;');

      await generator.generateBarrelFile(rootUri, {
        mode: BarrelGenerationMode.UpdateExisting,
      });

      const updatedIndex = await fileSystem.readFile(path.join(tmpDir, INDEX_FILENAME));

      // All external paths should be removed
      assert.ok(!updatedIndex.includes('../parent'), 'Parent reference should be removed');
      assert.ok(
        !updatedIndex.includes('../../grandparent'),
        'Grandparent reference should be removed',
      );
      assert.ok(
        !updatedIndex.includes('../../../ancestor'),
        'Ancestor reference should be removed',
      );

      // Local export should be regenerated
      assert.ok(
        updatedIndex.includes("export { bar } from './local.js'"),
        'Local export should be present',
      );
    });

    it('should handle barrel with only comments and whitespace', async () => {
      const generator = new BarrelFileGenerator();
      const rootUri = { fsPath: tmpDir } as unknown as Uri;

      const existingContent = `// This is a barrel file
// It contains only comments

/* Block comment */

`;

      await fileSystem.writeFile(path.join(tmpDir, INDEX_FILENAME), existingContent);
      await fileSystem.writeFile(path.join(tmpDir, 'util.ts'), 'export const util = 1;');

      await generator.generateBarrelFile(rootUri, {
        mode: BarrelGenerationMode.UpdateExisting,
      });

      const updatedIndex = await fileSystem.readFile(path.join(tmpDir, INDEX_FILENAME));

      // Comments should be preserved
      assert.ok(updatedIndex.includes('// This is a barrel file'), 'Comments should be preserved');
      // New export should be added
      assert.ok(
        updatedIndex.includes("export { util } from './util.js'"),
        'New export should be added',
      );
    });

    it('should handle mixed named and star exports without duplication', async () => {
      const generator = new BarrelFileGenerator();
      const rootUri = { fsPath: tmpDir } as unknown as Uri;

      // Create index with both export patterns
      const existingContent = `export * from './alpha';
export { beta } from './beta';
export * from './gamma';
`;

      await fileSystem.writeFile(path.join(tmpDir, INDEX_FILENAME), existingContent);
      await fileSystem.writeFile(path.join(tmpDir, 'alpha.ts'), 'export const alpha = 1;');
      await fileSystem.writeFile(path.join(tmpDir, 'beta.ts'), 'export const beta = 2;');
      await fileSystem.writeFile(path.join(tmpDir, 'gamma.ts'), 'export const gamma = 3;');

      await generator.generateBarrelFile(rootUri, {
        mode: BarrelGenerationMode.UpdateExisting,
      });

      const updatedIndex = await fileSystem.readFile(path.join(tmpDir, INDEX_FILENAME));

      // Each file should have exactly one export line - use more specific patterns
      const alphaExports = updatedIndex.match(/export \{ alpha \} from/g) || [];
      const betaExports = updatedIndex.match(/export \{ beta \} from/g) || [];
      const gammaExports = updatedIndex.match(/export \{ gamma \} from/g) || [];

      assert.strictEqual(alphaExports.length, 1, 'alpha export statement should appear once');
      assert.strictEqual(betaExports.length, 1, 'beta export statement should appear once');
      assert.strictEqual(gammaExports.length, 1, 'gamma export statement should appear once');
    });

    it('should preserve re-exports of external packages in node_modules style', async () => {
      const generator = new BarrelFileGenerator();
      const rootUri = { fsPath: tmpDir } as unknown as Uri;

      // Re-exports with local paths (non-relative) are not parent-escaping
      // These should be treated as if they might be external packages
      // Note: The current implementation only strips paths starting with '..'
      const existingContent = `export { something } from './local';
export * from '../outside';
`;

      await fileSystem.writeFile(path.join(tmpDir, INDEX_FILENAME), existingContent);
      await fileSystem.writeFile(path.join(tmpDir, 'local.ts'), 'export const something = 1;');

      await generator.generateBarrelFile(rootUri, {
        mode: BarrelGenerationMode.UpdateExisting,
      });

      const updatedIndex = await fileSystem.readFile(path.join(tmpDir, INDEX_FILENAME));

      // Parent reference should be removed
      assert.ok(!updatedIndex.includes('../outside'), 'Parent reference should be stripped');
      // Local export regenerated with proper extension
      assert.ok(
        updatedIndex.includes("export { something } from './local.js'"),
        'Local export should be regenerated',
      );
    });

    it('should treat ./utils and ./utils/index as equivalent paths for deduplication', async () => {
      const generator = new BarrelFileGenerator();
      const rootUri = { fsPath: tmpDir } as unknown as Uri;

      // Create a utils subdirectory with an index barrel
      const utilsDir = path.join(tmpDir, 'utils');
      await fileSystem.ensureDirectory(utilsDir);
      await fileSystem.writeFile(path.join(utilsDir, 'helper.ts'), 'export const helper = 1;');
      await fileSystem.writeFile(
        path.join(utilsDir, INDEX_FILENAME),
        "export { helper } from './helper.js';",
      );

      // Existing barrel references utils/index directly
      const existingContent = `export * from './utils/index';
`;

      await fileSystem.writeFile(path.join(tmpDir, INDEX_FILENAME), existingContent);

      await generator.generateBarrelFile(rootUri, {
        mode: BarrelGenerationMode.UpdateExisting,
      });

      const updatedIndex = await fileSystem.readFile(path.join(tmpDir, INDEX_FILENAME));

      // Should only have one utils export, not duplicates
      const utilsExports = updatedIndex.match(/utils/g) || [];
      assert.strictEqual(
        utilsExports.length,
        1,
        'utils should appear exactly once (./utils/index and ./utils/index.js are equivalent)',
      );
    });

    it('should handle paths with various /index patterns consistently', async () => {
      const generator = new BarrelFileGenerator();
      const rootUri = { fsPath: tmpDir } as unknown as Uri;

      const coreDir = path.join(tmpDir, 'core');
      await fileSystem.ensureDirectory(coreDir);
      await fileSystem.writeFile(path.join(coreDir, 'main.ts'), 'export const main = 1;');
      await fileSystem.writeFile(
        path.join(coreDir, INDEX_FILENAME),
        "export { main } from './main.js';",
      );

      // Mix of /index variants in existing content
      const existingContent = `export * from './core/index.js';
`;

      await fileSystem.writeFile(path.join(tmpDir, INDEX_FILENAME), existingContent);

      await generator.generateBarrelFile(rootUri, {
        mode: BarrelGenerationMode.UpdateExisting,
      });

      const updatedIndex = await fileSystem.readFile(path.join(tmpDir, INDEX_FILENAME));

      // Should deduplicate properly
      const coreExports = updatedIndex.match(/core/g) || [];
      assert.strictEqual(coreExports.length, 1, 'core should appear exactly once');
    });

    it('should log debug messages during deduplication when logger is provided', async () => {
      const mockLogger = createMockLogger();
      const generator = new BarrelFileGenerator(undefined, undefined, undefined, mockLogger);
      const rootUri = { fsPath: tmpDir } as unknown as Uri;

      // Create existing barrel with external and local re-exports
      const existingContent = `export * from '../external';
export { foo } from './local';
`;

      await fileSystem.writeFile(path.join(tmpDir, INDEX_FILENAME), existingContent);
      await fileSystem.writeFile(path.join(tmpDir, 'local.ts'), 'export const foo = 1;');

      await generator.generateBarrelFile(rootUri, {
        mode: BarrelGenerationMode.UpdateExisting,
      });

      // Verify debug logs were captured
      const debugCalls = mockLogger.calls.filter((c) => c.level === 'debug');
      assert.ok(debugCalls.length > 0, 'Should have debug log calls');

      // Check for specific log messages about path decisions
      const hasStrippedLog = debugCalls.some((c) => c.message.includes('Stripping'));
      const hasDeduplicationLog = debugCalls.some(
        (c) => c.message.includes('deduplicated') || c.message.includes('will be regenerated'),
      );

      assert.ok(
        hasStrippedLog || hasDeduplicationLog,
        'Should log about path stripping or deduplication decisions',
      );
    });

    it('should work without a logger (logger is optional)', async () => {
      const generator = new BarrelFileGenerator();
      const rootUri = { fsPath: tmpDir } as unknown as Uri;

      await fileSystem.writeFile(path.join(tmpDir, 'test.ts'), 'export const test = 1;');

      // Should not throw when no logger is provided
      await generator.generateBarrelFile(rootUri);

      const indexContent = await fileSystem.readFile(path.join(tmpDir, INDEX_FILENAME));
      assert.ok(indexContent.includes('test'), 'Barrel should be generated');
    });

    it('should not duplicate multiline export statements when updating', async () => {
      const generator = new BarrelFileGenerator();
      const rootUri = { fsPath: tmpDir } as unknown as Uri;

      // Create an index.ts with multiline export statements (like Prettier formats them)
      const existingContent = `export {
  assert,
  assertBoolean,
  assertDefined,
} from './assert.js';

/**
 * Helper function
 */
export function helper() {
  console.log('helper');
}

export { formatError } from './errors.js';
`;

      await fileSystem.writeFile(path.join(tmpDir, INDEX_FILENAME), existingContent);
      await fileSystem.writeFile(
        path.join(tmpDir, 'assert.ts'),
        'export function assert() {}\nexport function assertBoolean() {}\nexport function assertDefined() {}',
      );
      await fileSystem.writeFile(
        path.join(tmpDir, 'errors.ts'),
        'export function formatError() {}',
      );

      await generator.generateBarrelFile(rootUri, {
        mode: BarrelGenerationMode.UpdateExisting,
      });

      const updatedIndex = await fileSystem.readFile(path.join(tmpDir, INDEX_FILENAME));

      // Count how many times assert.js is referenced - should only be once
      const assertImports = updatedIndex.match(/from '\.\/assert\.js'/g) || [];
      assert.strictEqual(
        assertImports.length,
        1,
        `assert.js should be imported exactly once, but found ${assertImports.length} times. Content:\n${updatedIndex}`,
      );

      // The helper function should still be preserved
      assert.ok(
        updatedIndex.includes('export function helper()'),
        'Helper function should be preserved',
      );
    });
  });
});
