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
npm run test
```

## Code style and quality

- Language: TypeScript
- Formatter: Prettier (`.prettierrc.json`)
- Lint config: `eslint.config.mjs`
- Architecture: favor small modules with clear responsibilities
- Keep generated barrel output deterministic and readable

## Testing expectations

- Tests live under `src/test/`.
- Test execution uses Node's built-in test runner via `scripts/run-tests.cjs`.
- Unit test titles must begin with `should`.
- Add tests for both success and failure paths.
- Prefer focused unit tests; add integration tests for behavior crossing module boundaries.

## Error handling conventions

Use shared helpers from `src/utils/errors.ts`:

- `getErrorMessage(error)`
- `formatErrorForLog(error)`

To clean up ad-hoc error checks:

```bash
npm run lint:fix
npm run fix:instanceof-error
```

## Commit and PR guidance

- Use conventional prefixes when possible: `feat:`, `fix:`, `docs:`, `test:`, `refactor:`, `chore:`
- Keep changes scoped and include doc updates for behavioral/script changes
- Update `CHANGELOG.md` for user-facing changes
- Include test updates for behavioral changes

## PR checklist

- [ ] `npm run lint` passes
- [ ] `npm run deps:check` passes
- [ ] `npm test` passes
- [ ] docs updated for command/script/behavior changes
- [ ] changelog updated for user-facing changes

## Questions

Open an issue or start a discussion in the repository.
