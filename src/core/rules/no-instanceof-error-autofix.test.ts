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
import { RuleTester } from 'eslint';
import { describe, it } from 'node:test';
import * as mod from '../../../scripts/eslint-plugin-local.mjs';

describe('no-instanceof-error-autofix rule', () => {
  // RuleTester typing mismatches with our rule shape; cast to any for tests
  const ruleTester = new (RuleTester as any)({
    parser: require.resolve('@typescript-eslint/parser'),
    parserOptions: { ecmaVersion: 2020, sourceType: 'module' },
  });

  const rule = mod.rules['no-instanceof-error-autofix'];
  const filename = path.join(process.cwd(), 'src', 'module', 'file.ts');
  const importPath = mod.computeImportPath(filename);

  /**
   * Helper function to run a test case for the no-instanceof-error-autofix rule.
   */
  function runTest(code: string, output: string, message: string) {
    ruleTester.run('no-instanceof-error-autofix', rule, {
      valid: [],
      invalid: [
        {
          code,
          filename,
          errors: [{ message }],
          output,
        },
      ],
    });
  }

  it('should merge getErrorMessage into existing named import', () => {
    const code = `import { existing } from '${importPath}';\nconst msg = err instanceof Error ? err.message : String(err);`;
    const output = `import { existing, getErrorMessage } from '${importPath}';\nconst msg = getErrorMessage(err);`;

    runTest(code, output, 'Use getErrorMessage() for predictable error messaging.');
  });

  it('should insert getErrorMessage import when none present', () => {
    const code = `const msg = err instanceof Error ? err.message : String(err);`;
    const output = `import { getErrorMessage } from '${importPath}';\nconst msg = getErrorMessage(err);`;

    runTest(code, output, 'Use getErrorMessage() for predictable error messaging.');
  });

  it('should merge formatErrorForLog into existing named import', () => {
    const code = `import { existing } from '${importPath}';\nconst out = err instanceof Error ? err.stack || err.message : String(err);`;
    const output = `import { existing, formatErrorForLog } from '${importPath}';\nconst out = formatErrorForLog(err);`;

    runTest(code, output, 'Use formatErrorForLog() to preserve stack or message for logging.');
  });
});
