# Hardening Plan

This document captures gaps in unit test coverage and provides pre/post implementation guidance to address them. It is intended as a living checklist for reliability work on the Barrel Roll VS Code extension.

## Step 1: Scope and Goals

The focus is on unit and integration coverage for edge cases in extension behavior, file system filtering, barrel generation, content sanitization, export parsing, and lint rule enforcement. It also includes structural refactoring guidance to reduce coupling and improve testability, plus a monorepo plan (Turbo) to enforce boundaries between the extension and core functionality.

## Step 1A: Clarity and Quality Controls

These items improve implementation clarity, reduce ambiguity, and increase deliverable quality.

### Definition of Done (Per Step)

- Acceptance criteria for each step must be explicit, measurable, and testable.
- Each step must state which tests are added or updated and which behaviors are verified.
- Each step must record whether it changes observable behavior or is refactor-only.

### Decision Log

- Record key decisions with date, choice, and rationale.
- Keep the log short and scoped to architectural or workflow decisions.

### Change Impact Checklist

- Files touched.
- Behavior changes expected.
- Risk level (low/medium/high).
- Rollback strategy if behavior regresses.

### Invariants

- `packages/core` must not import `vscode`.
- Barrel generation remains idempotent (running twice yields same output).
- The extension layer only composes and delegates (no core business logic).

### Refactor Sequencing Rule

- Split into two phases: extraction first, behavior second.
- Avoid mixing refactors with behavior changes in the same step.

### Test Plan Required

- Each step must include a minimal test plan (what will fail if wrong).
- Tests should assert both success and failure modes when applicable.

### Rollback Notes

- Each high-risk step must include a rollback note before implementation.

### Pre-Step Success Criteria

- Before starting a step, write clear success criteria that define completion.
- Criteria must be observable and verifiable (tests, logs, or outputs).
- Include at least one positive and one negative case when behavior changes.

## Step 2: Architecture Risks (Cohesion and Coupling)

### Low Cohesion

- `src/extension.ts` combines activation, logging setup, UI interactions, command registration, queueing, error handling, and progress handling.
- `src/core/barrel/barrel-file.generator.ts` mixes traversal strategy, export discovery, content building, sanitization, and IO.

### High Coupling

- `src/extension.ts` directly binds to `vscode` APIs and concrete implementations, forcing heavy module mocking.
- `BarrelFileGenerator` constructs or owns most dependencies internally, limiting substitution in tests.
- File system ignore policy is embedded inside `FileSystemService` rather than a dedicated policy.

### Design Intent

- Prefer composition over inheritance: small, focused services with injected dependencies.
- Keep core logic pure and immutable where possible (return new values instead of mutating shared state).
- Isolate `vscode` dependencies in the extension package boundary.

## Step 3: Recommendations (Coverage Gaps)

### Extension Behavior

- Add tests for command queue serialization across back-to-back invocations.
- Add tests that a failed command does not block subsequent queued operations.
- Add tests for `withProgress` error propagation when the task throws.
- Add tests for `showOpenDialog` throwing errors (not just returning `undefined`).
- Add tests for `ensureDirectoryUri` when `FileType.Unknown` or unexpected types are returned.

### File System Ignore Rules

- Add tests for expanded ignored directories (e.g., `dist`, `build`, `out`, `coverage`, `__mocks__`, `.vscode`, `.idea`).
- Add tests for case-insensitive matching (e.g., `Node_Modules`, `DIST`).
- Add tests for case-insensitive TypeScript and test file suffixes (e.g., `FILE.TEST.TS`).

### Barrel Generation

- Add tests for recursion depth behavior (max depth = 20) and safe termination.
- Add tests for partial failures when one file fails parsing and the rest continue.
- Add tests for export extension detection when existing barrels have no export lines.
- Add tests for errors when reading subdirectory barrel existence (stat/read errors).

### Content Sanitization

- Add tests for malformed multiline exports that never terminate.
- Add tests for Windows `\r\n` line endings and trailing whitespace around export lines.

### Export Patterns

- Add tests for double-quoted exports: `export { x } from "./foo";`.
- Add tests for `export * as ns from '...';` and `export type * from '...';` lines.

### Export Parser

- Add tests for `export * as ns from '...';` and type-only re-exports with module specifiers.
- Add tests for `export =` (CJS style) to validate expected behavior.
- Add tests for `.jsx`, `.mjs`, `.cjs` script kind selection.
- Add tests for binding pattern exports (e.g., `export const { a } = obj;`).

### ESLint Rule Coverage

- Restore RuleTester-based tests for `no-instanceof-error-autofix` once the new fix API is addressed.
- Add regression tests to assert expected fixes are applied correctly.

## Step 4: Pre-Implementation Guidance

### Baseline

- Run `npm test` to establish a baseline for current failures and timings.
- Record current test counts and coverage metrics if available (even informal).

### Prioritization

- Address high-risk and high-impact behaviors first:
  - Command queue serialization and failure isolation.
  - File system ignore list and case-insensitive behavior.
  - Barrel generation depth and partial failure handling.

### Test Strategy

- Prefer unit tests for deterministic behavior.
- Use targeted integration tests only for parsing or disk I/O edge cases that require real files.
- Avoid new dependencies unless necessary.

### Test Data

- Add fixtures under `src/test/fixtures` if needed instead of embedding large blobs in tests.
- Keep fixtures minimal and domain-focused.

## Step 5: Structural Refactoring Plan (Composition and Immutability)

### Analysis

- The extension should be a thin composition layer. Business logic should move to core modules with minimal or no `vscode` dependency.
- Generator orchestration should be split into smaller services that can be tested independently.
- Policies (like ignore lists) should be separated from IO services.

### Target Decomposition

- `CommandHandler` (new): orchestration for command execution, queueing, progress, and errors.
- `DirectoryScanner` (new): returns `{ tsFiles, subdirectories }` for a given directory path.
- `EntryCollector` (new): transforms files + subdirectories into `Map<string, BarrelEntry>`.
- `BarrelWriter` (new): determines extension, sanitizes existing content, and writes output.
- `IgnorePolicy` (new): pure predicate for traversable directories.

### Immutable Data Flow

- Ensure each step returns new objects (e.g., new `Map` or `Set`) and does not mutate shared state.
- Keep IO at the edges, with pure transformations in the center.

### Stepwise Refactoring Sequence

1. Extract `IgnorePolicy` from `FileSystemService` and update tests.
2. Extract `DirectoryScanner` and `EntryCollector` from `BarrelFileGenerator`.
3. Extract `BarrelWriter` from `BarrelFileGenerator`.
4. Replace `BarrelFileGenerator` with a coordinator that wires these services.
5. Move command pipeline logic into `CommandHandler` and slim `src/extension.ts`.
6. Update unit tests to target new services directly, and reduce `vscode` mocking.

## Step 6: Implementation Guidance for Test Coverage

1. Extension command queue tests.
2. FileSystemService ignore list and case-insensitivity tests.
3. Barrel generation recursion depth and partial failure tests.
4. Content sanitizer and export pattern edge cases.
5. Export parser special forms.
6. ESLint rule fix tests once the rule is updated.

### Notes

- Keep test titles starting with `should` to satisfy the ESLint rule.
- Use `src/test/testTypes.ts` helpers for mocks and fake URIs.
- For module mocks, rely on `--experimental-test-module-mocks` (already enabled in `scripts/run-tests.cjs`).

## Step 7: Monorepo Hardening Plan (Turbo + Workspaces)

### Goal

Create strict boundaries between the VS Code extension surface and the core barrel logic, improving testability, reuse, and release discipline.

### Proposed Structure

- `packages/core`
  - Pure logic: parsing, barrel generation, content sanitization, ignore policies, logging interfaces.
- `packages/extension`
  - VS Code entrypoint and composition only.
- `packages/shared` (optional)
  - Shared types or utilities, if needed.

### Boundary Rules

- `packages/core` must not import `vscode`.
- `packages/extension` depends on `packages/core`.
- Cross-package communication through explicit interfaces and composition.

### Tooling

- Turbo for task orchestration (`build`, `lint`, `test`, `package`).
- Workspace manager (recommend `npm` workspaces to reduce churn).

### Stepwise Implementation Plan

1. Add workspace root configuration (workspaces + Turbo config).
2. Create `packages/core` and move core modules:
   - `src/core`, `src/utils`, `src/types`, `src/logging` (or subset if logging remains extension-only).
3. Create `packages/extension` and move:
   - `src/extension.ts`, `src/test/unit/extension.test.ts`, VS Code packaging files.
4. Update import paths and build output:
   - Extension depends on `@barrel-roll/core` (workspace alias).
5. Update `scripts/` and test runners to run per-package tasks.
6. Update CI to run Turbo tasks and cache where appropriate.
7. Validate VSIX packaging from `packages/extension`.

### Pre-Migration Checklist

- Ensure tests pass in current layout.
- Ensure build pipeline is stable and deterministic.
- Decide on workspace manager and lockfile strategy.

### Post-Migration Checklist

- Confirm no `vscode` imports in `packages/core`.
- Confirm `packages/core` unit tests run without VS Code.
- Confirm extension activation still works and packaging is correct.
- Confirm Turbo cache and task graph are correct.

## Step 8: Post-Implementation Guidance

### Validation

- Re-run `npm test` and confirm stability.
- If any failures are flaky, quarantine and triage with isolation.
- Confirm no regressions in existing test expectations.

### Review Checklist

- New tests cover at least one previously untested edge case.
- All new tests have `should ...` titles.
- Assertions are specific and error messages are clear.
- No new lint warnings introduced.

### Maintenance

- Keep this document updated as tests are added or behavior changes.
- Move resolved items to a separate `Resolved` section if the list grows.

## Step 9: Next Steps to Tackle (Actionable)

1. Extract `IgnorePolicy` from `FileSystemService` and add case-insensitive tests.
2. Split `BarrelFileGenerator` into `DirectoryScanner`, `EntryCollector`, `BarrelWriter`.
3. Extract `CommandHandler` and slim `src/extension.ts` to pure composition.
4. Add missing edge-case tests:
   - Command queue serialization and failure isolation.
   - Recursion depth max guard behavior.
   - Export pattern cases (double quotes, `export * as`).
