# Change Log

All notable changes to the "barrel-roll" extension will be documented in this file.

## [Unreleased]

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
