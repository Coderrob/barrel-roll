# Agents & Automation

This file documents automation, scripts, and "agent"-style tooling used in the repository.

## Overview

- Purpose: centralize notes about automation, dependency checks, CI steps, and conventions so they are easy to find and maintain.

## Dependency checks

- Canonical runner: `scripts/run-depcheck.cjs`
- Command: `npm run deps:check`
- Behavior: runs `depcheck` programmatically, writes `.depcheck.json`, filters references found in repository files and scripts, and exits non-zero if unused packages remain.
- Rationale: avoids `npx` platform issues and ensures CI and local runs behave identically.

## Testing & test conventions

- Test naming: all unit test titles must start with the word `should` (e.g., `should return true when input is null`). This is enforced by an ESLint rule.
- Shared test helpers: use `src/test/testTypes.ts` for common test utilities (fake URIs, logger helpers, etc.).
- Test runner: `scripts/run-tests.js` executes the test suite; invoked by `npm test` and `npm run test:unit`.
- Commands:
  - `npm test` — full pipeline (compile tests, compile extension, lint, then run tests)
  - `npm run test:unit` — quick test run (compile tests and extension, then run tests without linting)
  - `npm run test:vscode` — VS Code integration tests (compile tests, then run VS Code test harness)

## Packaging & release

- Packaging: `npm run package` / `npm run ext:package`
- Install packaged VSIX locally: `npm run ext:install`
- Quick reinstall: `npm run ext:reinstall` (packages and installs the latest vsix using `scripts/install-extension.cjs` which uses package.json version)

## CI

- The CI workflows run the dependency check and tests. See `.github/workflows/ci.yml` and `.github/workflows/release.yml`.

## How to run locally

```bash
# install deps
npm install

# run dependency check
npm run deps:check

# run lint + dependency check
npm run lint

# run tests
npm test
```

If you have questions about automation or want to extend the tooling, please open a PR or ask in the repository discussion.
