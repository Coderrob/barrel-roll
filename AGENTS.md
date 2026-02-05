# Agents & Automation

This file documents automation, scripts, CI checks, and packaging conventions used in this repository.

## Overview

- Purpose: keep automation behavior and developer conventions in one place.
- Scope: dependency checks, test execution, packaging/release commands, and CI expectations.

## Dependency checks

- Canonical runner: `scripts/run-depcheck.cjs`
- Command: `npm run deps:check`
- Behavior: runs `depcheck` programmatically, writes `.depcheck.json`, filters references found in repository files/scripts, and exits non-zero when unused packages remain.
- Rationale: avoids `npx` platform inconsistencies and keeps local/CI behavior aligned.

## Testing conventions

- Unit test titles must start with `should` (enforced by ESLint).
- Shared test helpers live in `src/test/testTypes.ts`.
- Test runner script: `scripts/run-tests.cjs`.
- Test discovery is glob-based in `dist/test/**` and `dist/src/test/**` to support platform/compiler output differences.
- Test commands:
  - `npm test` - compile tests, compile extension, lint, then run tests
  - `npm run test:unit` - compile tests, compile extension, then run tests (no lint)
  - `npm run test:vscode` - compile tests, run VS Code integration harness

## Packaging and release

- Bundle compile: `npm run package`
- VSIX package: `npm run ext:package`
- Install packaged VSIX: `npm run ext:install`
- Quick reinstall: `npm run ext:reinstall`

### Publish allowlist

`.vscodeignore` uses an allowlist strategy. Intended packaged files are:

- `package.json`
- `LICENSE`
- `README.md`
- `dist/extension.js`
- `public/img/barrel-roll-icon.png`

Verify with `npx @vscode/vsce ls` before publishing.

### Packaging note

`vsce` may include generated companion files in some builds (for example, source maps and webpack license sidecars). Always validate the actual file list from `vsce ls` before release.

## CI

CI runs dependency checks and tests. See:

- `.github/workflows/ci.yml`
- `.github/workflows/release.yml`

## Local runbook

```bash
npm install
npm run deps:check
npm run lint
npm test
```

## Change discipline

When changing automation scripts, update this document and relevant user-facing docs (`README.md`, `CONTRIBUTING.md`) in the same PR.
