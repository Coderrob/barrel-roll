# Contributing to Barrel Roll

Thanks for contributing.

## Development setup

1. Fork and clone:

```bash
git clone https://github.com/YOUR_USERNAME/barrel-roll.git
cd barrel-roll
```

2. Install dependencies:

```bash
npm install
```

3. Build once:

```bash
npm run compile
```

## Local development workflow

1. Open the workspace in VS Code.
1. Press `F5` to launch an Extension Development Host.
1. Right-click a folder and run:
   - `Barrel Roll Directory`
   - `Barrel Roll Directory (Recursive)`

## Recommended loop while developing

```bash
npm run compile
npm run test:unit
```

Use full validation before submitting:

```bash
npm run lint
npm run deps:check
npm run coverage:verify
npm run memory:check
```

## Code style and quality

Run `npm run quality` before submitting changes. It includes formatting and ESLint checks,
dependency-cruiser validation, duplicate-code detection, and TypeScript-aware Madge analysis.

- Language: TypeScript
- Formatter: Prettier (`.prettierrc.json`)
- Lint config: `eslint.config.mjs`
- Architecture: favor small modules with clear responsibilities
- Keep generated barrel output deterministic and readable

## Testing expectations

- Tests live under `src/test/`.
- Test execution uses Node's built-in test runner via `scripts/run-tests.cjs`.
- `npm run test:vscode` compiles the tests and current extension bundle, then launches the real
  VS Code-hosted contract. It activates the development extension, checks command registration,
  executes barrel generation, and validates its output. The first run may download VS Code;
  headless Linux requires a display host such as Xvfb.
- Unit test titles must begin with `should`.
- Keep unit tests FAST: fast, autonomous, self-validating, and timely. Do not put network calls,
  subprocesses, real-time waits, or heap stress loops in unit tests.
- Add tests for both success and failure paths.
- Prefer focused unit tests; add integration tests for behavior crossing module boundaries.
- Run `npm run coverage:verify`; every executable production file must exceed 95% for statements, branches,
  functions, and lines.
- The test compiler clears stale `dist/src` and `dist/test` output before compiling; do not bypass it
  when validating coverage.
- Run `npm run memory:check` for bounded, offline heap-retention and async-resource validation.

## Error handling conventions

Use shared helpers from `src/utils/errors.ts`:

- `getErrorMessage(error)`
- `formatErrorForLog(error)`

To clean up ad-hoc error checks:

```bash
npm run lint:fix
```

## Commit and PR guidance

- Use conventional prefixes when possible: `feat:`, `fix:`, `docs:`, `test:`, `refactor:`, `chore:`
- Keep changes scoped and include doc updates for behavioral/script changes
- Update `CHANGELOG.md` for user-facing changes
- Include test updates for behavioral changes

## Preparing and publishing releases

Add notes to `CHANGELOG.md` under `## [Unreleased]`, then manually run **Prepare Release** on `main`.
Choose `major`, `minor`, or `revision` (patch). The workflow updates `package.json`, `package-lock.json`,
and the dated changelog, runs `npm run release:verify`, and opens a PR. It refuses empty release notes.
Review and merge the PR before tagging its merged commit with the exact `vMAJOR.MINOR.PATCH` version.

Tag pushes run **Publish To npm**; manual dispatch on `main` accepts an existing tag for publishing
or retries. Tag, manifest, lockfile, changelog, and ancestry on `main` must agree. Publishing uses npm
trusted publishing for `Coderrob/barrel-roll` and `publish-npm.yml`, with direct publishing allowed
and no environment. The package must already exist and have this trusted publisher configured.
Confirm npm name ownership and choose a version that has never been published.

Repository Actions settings must permit Actions to create PRs. The default `GITHUB_TOKEN` does not
trigger PR CI; the preparation run validates the candidate. To satisfy required PR checks, configure
the optional `RELEASE_PR_TOKEN` secret with contents and pull-request write access. See the README's
npm release instructions for setup and the npm package's VS Code-host requirement.

Release helper tests are offline and run with `npm run release:test`; CI runs them on every platform.
`npm run npm:pack:check` verifies exactly the documented npm files after building. Do not weaken this
check or include development files in the published package.

## PR checklist

- [ ] `npm run lint` passes
- [ ] `npm run deps:check` passes
- [ ] `npm run coverage:verify` passes
- [ ] `npm run memory:check` passes
- [ ] docs updated for command/script/behavior changes
- [ ] changelog updated for user-facing changes

## Questions

Open an issue or start a discussion in the repository.
