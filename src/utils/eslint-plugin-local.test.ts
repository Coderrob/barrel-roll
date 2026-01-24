import path from 'node:path';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import * as mod from '../../scripts/eslint-plugin-local.mjs';

const { computeImportPath, mergeNamedImportText, canMergeNamedImport, hasNamedImport } = mod;

describe('eslint plugin helpers', () => {
  it('should mergeNamedImportText merge into existing named import string', () => {
    const sourceCode = {
      getText() {
        return "import { existing } from './utils/index.js';";
      },
    };

    const result = mergeNamedImportText(sourceCode, {}, 'getErrorMessage');

    // Current implementation preserves minimal spacing; Prettier will normalize formatting as needed
    assert.strictEqual(result, "import {existing, getErrorMessage} from './utils/index.js';");
  });

  it('should mergeNamedImportText return null for imports without braces', () => {
    const sourceCode = {
      getText() {
        return "import defaultExport from './utils/index.js';";
      },
    };

    const result = mergeNamedImportText(sourceCode, {}, 'getErrorMessage');

    assert.strictEqual(result, null);
  });

  it('should canMergeNamedImport detect named import specifiers', () => {
    const importNode = { specifiers: [{ type: 'ImportSpecifier' }] };
    assert.strictEqual(canMergeNamedImport(importNode), true);
  });

  it('should hasNamedImport find named import by path and name', () => {
    const importPath = './utils/index.js';
    const astBody = [
      {
        type: 'ImportDeclaration',
        source: { value: importPath },
        specifiers: [{ type: 'ImportSpecifier', imported: { name: 'foo' } }],
      },
    ];

    assert.strictEqual(hasNamedImport(astBody, importPath, 'foo'), true);
    assert.strictEqual(hasNamedImport(astBody, importPath, 'bar'), false);
  });

  it('should computeImportPath produce a relative path to utils index.js', () => {
    const filename = path.join(process.cwd(), 'src', 'module', 'file.ts');
    const p = computeImportPath(filename);

    // Path should either be a relative path or a path ending with src/utils/index.js
    assert.ok(
      p.endsWith('/src/utils/index.js') || p.startsWith('.') || p.includes('/src/utils/index.js'),
    );
  });
});
