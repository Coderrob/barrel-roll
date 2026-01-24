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
   *
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
