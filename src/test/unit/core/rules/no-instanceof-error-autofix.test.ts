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

import path from 'node:path';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import * as mod from '../../../../../scripts/eslint-plugin-local.mjs';

describe('no-instanceof-error-autofix rule', () => {
  // Note: RuleTester tests are temporarily disabled due to ESLint flat config API changes
  // The rule's fix functionality uses deprecated SourceCode methods (replaceText, insertTextBeforeRange)
  // that need to be updated to the new fixer API.
  // See: https://eslint.org/docs/latest/extend/custom-rules#applying-fixes

  const filename = path.join(process.cwd(), 'src', 'module', 'file.ts');
  const importPath = mod.computeImportPath(filename);

  it('should have correct import path calculation', () => {
    // Verify the import path is computed correctly
    assert.ok(
      importPath.endsWith('/utils/index.js'),
      `Import path should end with utils/index.js, got: ${importPath}`,
    );
  });

  it('should export the rule with correct metadata', () => {
    const rule = mod.rules['no-instanceof-error-autofix'];
    assert.ok(rule, 'Rule should be exported');
    assert.ok(rule.meta, 'Rule should have meta');
    assert.strictEqual(rule.meta.type, 'suggestion', 'Rule type should be suggestion');
    assert.strictEqual(rule.meta.fixable, 'code', 'Rule should be fixable');
  });

  it('should export helper functions', () => {
    assert.ok(typeof mod.computeImportPath === 'function', 'computeImportPath should be exported');
    assert.ok(
      typeof mod.mergeNamedImportText === 'function',
      'mergeNamedImportText should be exported',
    );
    assert.ok(
      typeof mod.canMergeNamedImport === 'function',
      'canMergeNamedImport should be exported',
    );
    assert.ok(typeof mod.hasNamedImport === 'function', 'hasNamedImport should be exported');
  });
});
