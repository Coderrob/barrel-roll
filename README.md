<p align="center">
  <img
    src="public/img/barrel-roll-icon.png"
    alt="Barrel Roll logo"
  />
</p>

# Barrel Roll

[![CI](https://github.com/Coderrob/barrel-roll/actions/workflows/ci.yml/badge.svg)](https://github.com/Coderrob/barrel-roll/actions/workflows/ci.yml)
[![Code Style: Prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg)](https://prettier.io/)
[![Coverage](https://img.shields.io/badge/coverage-98.7%25-4c1)](badges/coverage.svg)
[![ESLint](https://img.shields.io/badge/ESLint-9.x-4B32C3.svg)](https://eslint.org/)
[![License: Apache-2.0](https://img.shields.io/github/license/Coderrob/barrel-roll)](LICENSE)
[![Quality Checks](https://img.shields.io/badge/quality--checks-eslint%20%7C%20madge%20%7C%20jscpd-1f6feb)](package.json)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6.svg)](https://www.typescriptlang.org/)
[![VS Code Marketplace Installs](https://img.shields.io/visual-studio-marketplace/i/Coderrob.barrel-roll)](https://marketplace.visualstudio.com/items?itemName=Coderrob.barrel-roll)
[![VS Code Marketplace Version](https://img.shields.io/visual-studio-marketplace/v/Coderrob.barrel-roll)](https://marketplace.visualstudio.com/items?itemName=Coderrob.barrel-roll)

Barrel Roll is a Visual Studio Code extension that automates creation and maintenance of `index.ts` barrel files. Right-click a folder, run a Barrel Roll command, and the extension generates exports from real TypeScript declarations while keeping output deterministic and readable.

## Features

- Right-click generation of `index.ts` barrel files from the VS Code explorer
- Two command modes: single directory and recursive directory processing
- Recursive barrel generation for child folders with parent re-export wiring
- Export detection for TypeScript values, type-only exports, and default exports
- Stable alphabetical ordering to keep diffs small and predictable
- Sanitized updates that preserve direct definitions in existing `index.ts`
- Built-in safeguards for ignored directories and oversized files

## Installation

### From VS Code Marketplace

1. Open VS Code
1. Go to Extensions (`Ctrl+Shift+X` / `Cmd+Shift+X`)
1. Search for `Barrel Roll`
1. Click Install

### From VSIX

1. Download the latest `.vsix` file from the [releases page](https://github.com/Coderrob/barrel-roll/releases)
1. In VS Code, go to Extensions
1. Click the `...` menu and select `Install from VSIX...`
1. Select the downloaded file

## Usage

1. Right-click a folder in the VS Code explorer
1. Run one of these commands:
   - `Barrel Roll Directory`
   - `Barrel Roll Directory (Recursive)`
1. Barrel Roll will:
   - scan `.ts`/`.tsx` files (excluding `index.ts`, declaration files, and test files)
   - generate or update `index.ts`
   - recursively generate child barrels when recursive mode is selected
   - preserve direct definitions in existing index files while refreshing export lines

You can also run both commands from the Command Palette.

### Example

Given:

```typescript
// user.ts
export class User {}
export interface UserData {}

// auth.ts
export function login() {}
export function logout() {}

// constants.ts
export const API_URL = 'https://api.example.com';
```

Barrel Roll generates:

```typescript
// index.ts
export { login, logout } from './auth.js';
export { API_URL } from './constants.js';
export { User } from './user.js';
export type { UserData } from './user.js';
```

## Development

### Prerequisites

- Node.js 22.22.2+ (or 24.15+)
- npm 10+

### Common commands

```bash
npm install
npm run compile
npm run compile-tests
npm run test
npm run test:unit
npm run test:vscode
npm run coverage:verify
npm run memory:check
npm run lint
npm run deps:check
npm run quality
```

The quality command checks formatting and lint rules, unused and architectural dependencies,
duplicate code, and TypeScript circular/orphan modules.

### Testing notes

- `npm test` runs compile, lint, dependency check, then the Node test suite via `scripts/run-tests.cjs`.
- `npm run test:unit` runs a faster compile + test path without lint.
- `npm run coverage:verify` requires every executable production file to exceed 95% statements, branches,
  functions, and lines.
- Test compilation clears stale TypeScript output before coverage so removed files cannot silently
  remain in the measured `dist/src` tree.
- `npm run memory:check` runs the bounded cache/parser heap-retention probe with forced garbage
  collection; it is intentionally separate from the fast unit suite.
- `npm run test:vscode` builds the current extension bundle and launches a real VS Code extension
  host. The contract activates the extension, verifies both contributed commands, executes barrel
  generation, and validates the generated `index.ts`. The first run may download the VS Code test
  binary; headless Linux environments require a display host such as Xvfb.
- Unit and integration tests live under `src/test/`.
- Unit test names must start with `should` and follow FAST: fast, autonomous, self-validating, and
  timely.

### Dependency checking

`npm run deps:check` uses `scripts/run-depcheck.cjs` (programmatic depcheck runner). It writes `.depcheck.json`, filters known script/repository references, and fails when unused dependencies remain.

### Automated dependency updates

Dependabot checks npm packages and GitHub Actions weekly and groups version updates into one PR per
ecosystem. Routine updates wait until releases are at least 12 days old to reduce exposure to newly
published packages. Security updates are grouped separately and bypass this cooldown. See
[`.github/dependabot.yml`](.github/dependabot.yml) for the policy.

### Packaging and release

```bash
# Build production bundle used by VS Code prepublish
npm run package

# Build VSIX package
npm run ext:package

# Install latest packaged VSIX locally
npm run ext:install

# Build + install
npm run ext:reinstall
```

### VSIX contents

Publishing uses an allowlist in `.vscodeignore` so only runtime assets are intentionally included:

- `package.json`
- `LICENSE`
- `README.md`
- `dist/extension.js`
- `public/img/barrel-roll-icon.png`

Use `npm exec --no -- vsce ls` to inspect final package contents before publishing. `@vscode/vsce`
is locked as a development dependency, and CI validates real VSIX packaging on all three platforms.

### Publish to Visual Studio Marketplace

After merging a release commit, create a tag matching the extension version, such as `v1.1.3`, or
the existing `v1.1.3_COMMIT` convention with its matching 7–40 character lowercase commit hash.
The tagged commit must be reachable from `main` and include the locked `@vscode/vsce` dependency.

Run **Publish to Visual Studio Marketplace** from the Actions tab, select `main`, and enter that tag.
The workflow checks tag/version/identity agreement, runs quality, type, coverage, and memory checks,
then builds and publishes the validated VSIX with `vsce`. The tag-triggered **Release** workflow
continues to attach VSIX files to GitHub releases.

Set up the publishing token once:

1. Create a [Marketplace publishing token](https://code.visualstudio.com/api/working-with-extensions/publishing-extension#get-a-personal-access-token)
   using an account authorized to publish under `coderrob`, with the Marketplace **Manage** scope.
1. In this repository's **Settings → Secrets and variables → Actions**, add a repository secret named
   `VSCE_PAT` containing that token.

The workflow passes `VSCE_PAT` only to the final publish step. `vsce` reads that environment variable
and publishes the validated VSIX as `coderrob.barrel-roll`. Rotate the secret when the token expires.

## Known limitations

- Scans only `.ts` and `.tsx` source files.
- Dynamic runtime-created named exports cannot be statically detected.
- Existing `index.ts` content is sanitized to preserve direct declarations, but malformed export syntax may still require manual cleanup.

## Architecture

For architecture details and module-level responsibilities, see `ARCHITECTURE.md`.

## Contributing

Contributions are welcome. See `CONTRIBUTING.md` and `AGENTS.md` for contribution and automation details.

## License

Apache 2.0. See [LICENSE](LICENSE).

## Ownership

Maintained by Robert Lindley.
