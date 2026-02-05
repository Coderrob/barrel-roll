// Modern ESLint Flat Configuration
// See: https://eslint.org/docs/latest/use/configure/configuration-files

import path from 'node:path';
import { fileURLToPath } from 'node:url';

import js from '@eslint/js';
import typescriptEslint from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import _import from 'eslint-plugin-import';
import jsdoc from 'eslint-plugin-jsdoc';
import prettier from 'eslint-plugin-prettier';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import sonarjs from 'eslint-plugin-sonarjs';
import localPlugin from './scripts/eslint-plugin-local.mjs';
import globals from 'globals';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default [
  // Global ignores
  {
    ignores: [
      '**/coverage/**',
      '**/node_modules/**',
      '**/lib/**',
      '**/build/**',
      '**/dist/**',
      '**/.vscode-test/**',
      '*.config.{js,mjs,cjs}',
      'badges/**',
      'script/**',
      'test-project/**',
    ],
  },

  // Base configuration for all files
  {
    plugins: {
      prettier,
    },
    rules: {
      'prettier/prettier': ['error', { semi: true }],
    },
  },

  // TypeScript files configuration
  {
    files: ['**/*.{ts,tsx,mts,cts}'],
    languageOptions: {
      parser: tsParser,
      ecmaVersion: 2023,
      sourceType: 'module',
      parserOptions: {
        project: ['tsconfig.test.json'],
        tsconfigRootDir: __dirname,
      },
      globals: {
        ...globals.node,
        NodeJS: 'readonly',
        Atomics: 'readonly',
        SharedArrayBuffer: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': typescriptEslint,
      import: _import,
      jsdoc,
      'simple-import-sort': simpleImportSort,
      sonarjs,
      local: localPlugin,
    },
    settings: {
      'import/resolver': {
        typescript: {
          alwaysTryTypes: true,
          project: 'tsconfig.test.json',
        },
      },
    },
    rules: {
      // Base ESLint recommended
      ...js.configs.recommended.rules,

      // Complexity rules (fail build on high complexity)
      complexity: ['error', { max: 5 }],

      // SonarJS rules for static analysis (selective adoption)
      'sonarjs/cognitive-complexity': ['error', 8],

      'no-restricted-syntax': [
        'error',
        {
          selector: 'TSTypeQuery > TSImportType',
          message:
            "Avoid using 'typeof import(...)' types. Import the type directly instead (easier and clearer).",
        },
        {
          selector: "BinaryExpression[operator='instanceof'][right.name='Error']",
          message:
            "Avoid ad-hoc 'instanceof Error' checks — prefer `getErrorMessage` or `formatErrorForLog` from 'src/utils/errors' for consistent error handling and logging.",
        },
        {
          selector:
            "TSTypeReference[typeName.name='ReturnType'] > TSTypeParameterInstantiation > TSTypeReference[typeName.name='ReturnType']",
          message: 'Avoid nested ReturnType chains; define a named type/interface instead.',
        },
        {
          selector: 'TSTypeAnnotation > TSTypeLiteral',
          message:
            'Avoid inline object types in type annotations. Define a named interface or type alias instead.',
        },
      ],
      'sonarjs/no-duplicate-string': ['error', { threshold: 3 }],
      'local/no-instanceof-error-autofix': 'error',
      'local/no-parent-reexport-from-index': 'error',
      'local/no-index-access-types': 'error',
      'sonarjs/no-identical-functions': 'error',
      'sonarjs/prefer-immediate-return': 'error',
      'sonarjs/pseudo-random': 'warn',
      'sonarjs/publicly-writable-directories': 'warn',
      'sonarjs/no-inverted-boolean-check': 'error',
      'sonarjs/no-redundant-boolean': 'error',
      'sonarjs/no-unused-collection': 'error',
      'sonarjs/no-collapsible-if': 'error',
      'sonarjs/prefer-single-boolean-return': 'error',

      // TypeScript ESLint rules
      '@typescript-eslint/explicit-function-return-type': [
        'error',
        {
          allowExpressions: false,
          allowTypedFunctionExpressions: false,
          allowHigherOrderFunctions: false,
          allowDirectConstAssertionInArrowFunctions: false,
        },
      ],
      'jsdoc/require-jsdoc': [
        'error',
        {
          require: {
            FunctionDeclaration: true,
            MethodDefinition: true,
            ClassDeclaration: false,
            ArrowFunctionExpression: false,
            FunctionExpression: false,
          },
        },
      ],
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          destructuredArrayIgnorePattern: '^_',
          ignoreRestSiblings: true,
        },
      ],
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/require-await': 'error',
      '@typescript-eslint/unbound-method': 'error',
      '@typescript-eslint/no-unsafe-enum-comparison': 'error',
      '@typescript-eslint/no-unnecessary-type-assertion': 'error',
      '@typescript-eslint/no-duplicate-type-constituents': 'error',

      // Import sorting and organization
      'import/order': 'off',
      'simple-import-sort/imports': 'error',
      'simple-import-sort/exports': 'error',

      // Custom overrides
      camelcase: 'off',
      'no-console': 'off',
      'no-shadow': 'off',
      'space-in-parens': ['error', 'never'],
      'spaced-comment': ['error', 'always'],
    },
  },

  // Node test files and mock files configuration
  {
    files: [
      '**/__tests__/**/*.{ts,tsx}',
      '**/*.test.{ts,tsx}',
      '**/*.spec.{ts,tsx}',
      '**/__mocks__/**/*.{ts,tsx}',
    ],
    languageOptions: {
      globals: {
        ...globals.node,
        NodeJS: 'readonly',
      },
    },
    plugins: {},
    rules: {
      // Relax some rules for test files
      'sonarjs/no-duplicate-string': 'off',
      '@typescript-eslint/unbound-method': 'off',
      '@typescript-eslint/require-await': 'off',
      'sonarjs/publicly-writable-directories': 'off',
      'simple-import-sort/imports': 'off',
      'simple-import-sort/exports': 'off',
    },
  },

  // Allow 'instanceof Error' only within guards helper to implement the guard itself
  {
    files: ['src/utils/guards.ts'],
    rules: {
      'no-restricted-syntax': 'off',
    },
  },

  // Source files - relax strict return type rules since methods already have explicit return types
  {
    files: ['src/**/*.ts'],
    ignores: ['**/*.test.ts', '**/test/**'],
    rules: {
      '@typescript-eslint/explicit-function-return-type': 'off',
    },
  },

  // Restrict direct fs imports - use FileSystemService instead
  {
    files: ['src/**/*.ts'],
    ignores: ['**/file-system.service.ts', '**/*.test.ts', '**/test/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['fs', 'node:fs', 'fs/*', 'node:fs/*', 'fs/promises', 'node:fs/promises'],
              message: 'Use FileSystemService from core/io instead of direct fs imports.',
            },
          ],
        },
      ],
    },
  },

  // Mocha test suite files (VS Code extension integration tests)
  {
    files: ['**/src/test/suite/**/*.{ts,tsx}'],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.mocha,
        NodeJS: 'readonly',
        suite: 'readonly',
        test: 'readonly',
        setup: 'readonly',
        teardown: 'readonly',
        before: 'readonly',
        beforeEach: 'readonly',
        after: 'readonly',
        afterEach: 'readonly',
      },
    },
    rules: {
      // Relax rules for Mocha test files
      'sonarjs/no-duplicate-string': 'off',
      '@typescript-eslint/unbound-method': 'off',
      '@typescript-eslint/require-await': 'off',
      'sonarjs/publicly-writable-directories': 'off',
      'no-console': 'off',
      complexity: 'off',
      'sonarjs/cognitive-complexity': 'off',
      'simple-import-sort/imports': 'off',
      'simple-import-sort/exports': 'off',
    },
  },

  // Unit test files
  {
    files: ['**/*.test.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-floating-promises': 'off',
      // Enforce test naming convention: tests must start with 'should '
      'no-restricted-syntax': [
        'error',
        {
          selector:
            "CallExpression[callee.name=/^(it|test)$/][arguments.0.type='Literal'][arguments.0.value=/^(?!should ).*/]",
          message: "Test titles must start with 'should ' (e.g., 'should do X').",
        },
      ],
    },
  },

  // Test runner files
  {
    files: ['**/src/test/runTest.ts'],
    rules: {
      '@typescript-eslint/no-floating-promises': 'off',
      'local/no-index-access-types': 'off',
      'unicorn/prefer-top-level-await': 'off',
    },
  },

  // Test files - relax strict rules
  {
    files: ['**/*.test.ts', '**/*.test.js', '**/test/**'],
    rules: {
      '@typescript-eslint/explicit-function-return-type': 'off',
      'local/no-index-access-types': 'off',
      'no-restricted-syntax': 'off',
    },
  },
];
