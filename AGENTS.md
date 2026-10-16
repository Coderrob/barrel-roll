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

## Automated dependency updates

- Configuration: `.github/dependabot.yml`.
- Dependabot checks npm packages and GitHub Actions weekly, grouping all version updates into one PR
  per ecosystem.
- Routine updates wait until a release is at least 12 days old (`cooldown.default-days: 12`).
- Security updates use separate groups per ecosystem and bypass the version-update cooldown.
- Pin GitHub Actions to immutable commit hashes with release-version comments. Manual dependency
  refreshes must also respect the 12-day release age and existing peer/API compatibility constraints.
- When consolidating existing PRs, preserve their lockfile updates, validate the combined changes,
  and close superseded PRs only after the replacement PR exists.

## Testing conventions

- Unit test titles must start with `should` (enforced by ESLint).
- Shared test helpers live in `src/test/testTypes.ts`.
- Test runner script: `scripts/run-tests.cjs`.
- Test compilation script: `scripts/run-compile-tests.cjs`; it removes only stale `dist/src` and
  `dist/test` compiler outputs before invoking TypeScript so deleted sources cannot affect tests or
  coverage.
- Test discovery is glob-based in `dist/test/**` and `dist/src/test/**` to support platform/compiler output differences.
- Test commands:
  - `npm test` - compile tests, compile extension, lint, then run tests
  - `npm run test:unit` - compile tests, compile extension, then run tests (no lint)
  - `npm run test:vscode` - compile tests and the current extension bundle, then run the VS Code
    extension-host contract from `dist/src/test/runTest.js`
  - `npm run coverage:verify` - run the complete test suite with strict per-file coverage
  - `npm run memory:check` - run bounded heap-retention and async-resource checks

### FAST unit tests

All unit tests must follow the FAST principle:

- **Fast:** avoid network access, subprocesses, real timers, and unnecessary compiler or VS Code
  startup. Keep stress and heap diagnostics in dedicated scripts rather than the unit suite.
- **Autonomous:** isolate state per test; do not depend on execution order, prior tests, external
  services, user configuration, or machine-specific paths.
- **Self-validating:** use deterministic assertions and fail automatically without inspecting logs,
  generated reports, or snapshots by hand.
- **Timely:** add or update tests with the behavior they specify, including regression tests for
  discovered edge cases.

### Coverage and memory safety

- `npm run coverage:verify` is the canonical coverage gate.
- Every included executable production file must exceed 95% statements, branches, functions, and
  lines. Thresholds are configured as 95.01% with c8's per-file enforcement and `all: true`, so
  never-loaded runtime modules fail the gate. Exclusions are limited to tests, barrels, declarations,
  and compiler-emitted stubs for type-only modules; do not weaken thresholds or exclude executable
  production files to make the gate pass.
- `npm run memory:check` is the bounded, offline heap-retention check. It warms up runtime caches,
  forces garbage collection between samples, verifies bounded caches release entries, and rejects
  retained growth or leaked asynchronous resources.
- Memory stress checks are not unit tests and must remain deterministic and reasonably short.
- The VS Code extension-host test is intentionally separate from the FAST unit suite. It must
  activate `coderrob.barrel-roll`, verify contributed command registration, execute barrel
  generation through VS Code, and validate the generated file. Do not silently skip this test based
  on CI, TTY, or operating-system detection; provide the required display host on headless Linux.

### Defensive, self-describing code

- Validate boundary assumptions before destructive file operations, compiler invocation, resource
  accounting, and concurrency setup. Fail with an error that identifies the violated invariant.
- Concurrency helpers must bound both active operations and pending worker promises. Recursive
  traversal must preserve one effective file-system concurrency ceiling across sibling directories.
- Name functions and state after observable behavior (`collectFileEntries`, `longLivedParser`) and
  document concrete inputs, outputs, and failure conditions; placeholder contract text is not
  acceptable.
- Use `ReadonlyMap` and `ReadonlySet` for read-only inputs. When state must change, return a new
  collection or make the mutation boundary explicit rather than disguising mutable state as read-only.
- Release temporary parser/compiler resources in `finally` blocks and keep regression tests focused
  on public behavior, including ignored, empty, malformed, and failure inputs.

## Packaging and release

- Bundle compile: `npm run package`
- VSIX package: `npm run ext:package`
- Install packaged VSIX: `npm run ext:install`
- Quick reinstall: `npm run ext:reinstall`

### Marketplace publishing

- `@vscode/vsce` is a locked development dependency. `npm run ext:package` uses its local CLI;
  do not replace it with an unpinned global installation.
- CI creates a real VSIX on Linux, Windows, and macOS. The tag-based Release workflow uses the same
  command to attach a VSIX to the GitHub release.
- `.github/workflows/publish-vscode.yml` is manually dispatched from `main` with an existing release
  tag. It verifies ancestry on `main`, extension identity, package/lockfile versions, and any commit
  suffix, then runs quality, coverage, memory, and packaging checks before publishing that VSIX.
- Authentication uses `azure/login` with GitHub OIDC and `vsce publish --azure-credential`. Configure
  `AZURE_CLIENT_ID` and `AZURE_TENANT_ID` repository secrets, an Entra federated credential for
  `repo:Coderrob/barrel-roll:ref:refs/heads/main`, and Marketplace Contributor access for the identity.
  No Marketplace PAT or client secret is needed. See the README for setup.

### Publish allowlist

`.vscodeignore` uses an allowlist strategy. Intended packaged files are:

- `package.json`
- `LICENSE`
- `README.md`
- `dist/extension.js`
- `public/img/barrel-roll-icon.png`

Verify with `npm exec --no -- vsce ls` before publishing.

### Packaging note

`vsce` may include generated companion files in some builds (for example, source maps and webpack license sidecars). Always validate the actual file list from `vsce ls` before release.

## CI

CI runs dependency checks, architectural dependency validation, TypeScript-aware circular/orphan
analysis, duplication checks, per-file coverage, memory-retention checks, and tests. The canonical aggregate quality command is
`npm run quality`; `npm run lint:deps` invokes dependency-cruiser directly.

See:

- `.github/workflows/ci.yml`
- `.github/workflows/release.yml`

## Local runbook

```bash
npm install
npm run deps:check
npm run lint
npm run coverage:verify
npm run memory:check
```

## Change discipline

When changing automation scripts, update this document and relevant user-facing docs (`README.md`, `CONTRIBUTING.md`) in the same PR.
