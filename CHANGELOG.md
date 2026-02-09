# Change Log

All notable changes to the "barrel-roll" extension will be documented in this file.

## [Unreleased]

## [1.1.1]

### Fixed

- Export duplication during barrel operations when comments containing closing braces (`}`) were present in existing imports
- Regex patterns in `export-patterns.ts` now use non-greedy matching (`[\s\S]*?`) to properly handle comments with closing braces
- Added support for trailing line comments (`//`) and block comments (`/* */`) in export statements
- Added support for TypeScript's type-only exports (`export type { ... } from './path'`)
- Added support for comments between export parts (e.g., `export * /* comment */ from './path'`)
- Added support for exports without spaces (e.g., `export{` instead of `export {`, `export*from` instead of `export * from`)

### Added

- Comprehensive test coverage with 312 tests covering edge cases including:
  - Single-line and multiline exports with comments
  - Star exports with inline comments
  - Type-only exports
  - Varied whitespace handling
  - Exports without spaces after keywords
  - Edge cases for invalid export statements

### Changed

- `BarrelContentBuilder` now emits TypeScript 4.5+ mixed export syntax when a module has both value and type exports (for example: `export { Foo, type Bar } from './mod';`)
- Simplified module-path generation logic in `BarrelContentBuilder` for file vs directory exports while preserving cross-platform path normalization
- Consolidated barrel exports in `src/core/barrel/index.ts`, `src/types/index.ts`, and `src/logging/index.ts` to improve type/value export consistency
- Added `.depcheck.json` to `.gitignore` to avoid committing local dependency-check output
 - Streamlined exports in `src/types/index.ts` and related barrel index files for improved clarity and organization
 - Updated coverage badge to reflect 98.75% and refreshed `badges/coverage.svg`
 - Webpack: enhanced externals configuration to treat `ts-morph` and `@ts-morph/common` as externals, avoiding bundling their large dist artifacts
 - Updated package metadata: refined `keywords` in `package.json` for improved discoverability
 - Added `webpack-stats.json` to `.gitignore` to avoid committing build output artifacts

### Removed

- Removed Jest compatibility shim (`src/test/testHarness.ts`) and test barrel export file (`src/test/index.ts`)
- Removed Jest-specific dev dependencies (`eslint-plugin-jest`, `expect`) from the repository

## [1.1.0]

### Added

- `Semaphore` class for concurrency control to limit parallel operations
- `LoggerInstance` interface and logger type definitions for improved test doubles
- `normalizeCase()` function for cross-platform case-insensitive file comparisons
- Expanded `IGNORED_DIRECTORIES` from 2 to 28+ common directories (node_modules, dist, coverage, .vscode, **tests**, etc.)
- `IDEAS.md` to document deferred feature ideas (e.g., dynamic `.gitignore` integration)
- ESLint rule `no-restricted-imports` to enforce `FileSystemService` usage over direct `fs` imports
- ESLint rule `local/no-parent-reexport-from-index` to prevent parent directory re-exports from index files
- ESLint rule `local/no-index-access-types` to enforce named type aliases over inline indexed access types
- Enhanced barrel file generation with intelligent caching and concurrency control for large codebases
- File size validation in `FileSystemService` to prevent processing of oversized files
- Comprehensive unit tests for utility functions (array, assertion, error, string, semaphore)
- Smoke tests for barrel content builder and barrel file generator
- `src/vscode.ts` module for mocking VS Code APIs in tests

### Changed

- Reorganized test structure: moved tests from `src/` to `src/test/unit/` for clearer separation
- Simplified `.vscodeignore` to allowlist-only approach (5 files: LICENSE, package.json, README.md, dist/extension.js, icon)
- Refactored `barrel-file.generator.ts` by extracting `content-sanitizer.ts`, `export-cache.ts`, and `export-patterns.ts` modules
- Updated test runner script with `--experimental-test-module-mocks` flag for ESM mock support
- Refreshed repository documentation (`README.md`, `AGENTS.md`, `CONTRIBUTING.md`, `ARCHITECTURE.md`) to reflect current scripts, test layout, and VSIX packaging allowlist

### Fixed

- Case sensitivity bugs in `FileSystemService` on Windows (file extension matching, test file detection, directory traversal)
- Test consistency issues with async/await patterns in barrel content builder tests
- Critical bug where direct definitions in index.ts files were being removed during barrel roll updates

## [1.0.1]

### Changed

- Improved barrel file update logic to preserve direct definitions (functions, types, constants, enums) in index.ts files alongside re-exports

### Fixed

- Critical bug where direct definitions in index.ts files were being removed during barrel roll updates

## [1.0.0]

### Added

- Programmatic dependency checker: `scripts/run-depcheck.cjs` and `npm run deps:check` (used by `npm run lint` and CI)
- `AGENTS.md` documenting automation, dependency checks, and developer conventions
- Coverage reporting and badge generation (`c8` + `make-coverage-badge`)
- Scripts for packaging and local install: `scripts/install-extension.cjs`, `npm run ext:package`, `npm run ext:install`, `npm run ext:reinstall`

### Changed

- Consolidated depcheck runner and removed forwarder shims; unified dependency checking across local runs and CI
- Enforced test naming convention (`should ...`) via ESLint and centralized shared test helpers in `src/test/testTypes.ts`
- Optimized packaging and VSIX contents to reduce artifact size
- Made pino logging robust for bundling by removing transport dependencies and adding webpack IgnorePlugin
- Added c8 coverage thresholds and badge generation to the repository scripts

> Note: This project is in pre-release development; no prior released version is recorded in this log.
