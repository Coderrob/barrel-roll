<p align="center">
  <img
    src="public/img/barrel-roll-small-logo.png"
    alt="Barrel Roll logo"
  />
</p>

# Barrel Roll

[![CI](https://github.com/Coderrob/barrel-roll/actions/workflows/ci.yml/badge.svg)](https://github.com/Coderrob/barrel-roll/actions/workflows/ci.yml)
[![Code Style: Prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg)](https://prettier.io/)
[![Coverage](https://img.shields.io/badge/coverage-94.8%25-4c1)](badges/coverage.svg)
[![ESLint](https://img.shields.io/badge/ESLint-9.x-4B32C3.svg)](https://eslint.org/)
[![License: Apache-2.0](https://img.shields.io/github/license/Coderrob/barrel-roll)](LICENSE)
[![Quality Checks](https://img.shields.io/badge/quality--checks-eslint%20%7C%20madge%20%7C%20jscpd-1f6feb)](package.json)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6.svg)](https://www.typescriptlang.org/)
[![VS Code Marketplace Installs](https://img.shields.io/visual-studio-marketplace/i/Coderrob.barrel-roll)](https://marketplace.visualstudio.com/items?itemName=Coderrob.barrel-roll)
[![VS Code Marketplace Version](https://img.shields.io/visual-studio-marketplace/v/Coderrob.barrel-roll)](https://marketplace.visualstudio.com/items?itemName=Coderrob.barrel-roll)

Barrel Roll is a Visual Studio Code extension that makes barrel file creation and upkeep effortless. Right-click any folder, pick a Barrel Roll command, and the extension assembles a curated `index.ts` that reflects the exports your module actually exposes—no tedious manual wiring, no temptation to `export *` the entire directory.

Whether you need a single barrel refreshed or an entire tree brought into alignment, Barrel Roll keeps your exports clean, consistent, and ready for real work. It discovers TypeScript exports, connects child barrels to their parents, and prevents duplicate re-exports so your team can focus on building features instead of shuffling files.

## Features

- **Right-click Generation**: Right-click any folder in the VS Code explorer to generate or update an `index.ts` barrel file
- **Two Command Modes**: Choose between updating just the selected directory or traversing the full subtree via dedicated context menu entries
- **Recursive Barrels**: Automatically walks child folders, generating barrels for every directory and wiring parent barrels to re-export their children
- **Smart Export Detection**: Automatically detects and exports all TypeScript exports (classes, interfaces, types, functions, constants, enums)
- **Clean Architecture**: Follows SOLID principles for maintainability and extensibility
- **Parent Folder Filtering**: Automatically removes re-exports from parent folders
- **Alphabetical Ordering**: Generates consistently ordered exports for better readability

## Installation

### From VS Code Marketplace

1. Open VS Code
1. Go to Extensions (Ctrl+Shift+X / Cmd+Shift+X)
1. Search for "Barrel Roll"
1. Click Install

### From VSIX

1. Download the latest `.vsix` file from the [releases page](https://github.com/Coderrob/barrel-roll/releases)
1. In VS Code, go to Extensions
1. Click the `...` menu and select "Install from VSIX..."
1. Select the downloaded file

## Usage

1. Right-click on any folder in the VS Code explorer
1. Select one of the Barrel Roll commands:
   - `Barrel Roll: Update Barrel Directory` (updates only the selected folder)
   - `Barrel Roll: Update Barrel Directory (Recursive)` (updates the selected folder and all subfolders)
1. The extension will:
   - Scan all `.ts`/`.tsx` files in the folder (excluding `index.ts` and declaration files)
   - Recursively process each subfolder and generate its `index.ts`
   - Extract all exported items
   - Generate or update an `index.ts` file with proper exports and re-export child barrels
   - Filter out any re-exports from parent directories

You can also invoke these commands from the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`) by searching for their names.

### Example

Given these files in a folder:

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

Running Barrel Roll will generate:

```typescript
// index.ts
export { API_URL } from './constants';
export { login, logout } from './auth';
export { User, UserData } from './user';
```

## Development

### Prerequisites

- Node.js 18.x or 20.x
- npm 8.x or later

### Setup

```bash
npm install
```

### Build

```bash
npm run compile
```

### Watch Mode

```bash
npm run watch
```

### Testing

```bash
npm test
```

> Note: On Windows, VS Code integration tests are temporarily skipped because the bundled `Code.exe` rejects the CLI flags required by `@vscode/test-electron`. Unit tests and linting still run as part of the command.

### Linting

```bash
npm run lint
npm run lint:fix
```

### Formatting

```bash
npm run format
npm run format:check
```

### Package Extension

```bash
npm run package
```

## Architecture

The extension follows SOLID principles with clear separation of concerns:

- **BarrelFileGenerator**: Main orchestrator coordinating the barrel file generation process
- **FileSystemService**: Handles all file I/O operations
- **ExportParser**: Extracts export statements from TypeScript code
- **BarrelContentBuilder**: Builds the formatted content for barrel files

This architecture ensures:

- **Single Responsibility**: Each class has one clear purpose
- **Open/Closed**: Easy to extend without modifying existing code
- **Dependency Inversion**: High-level modules don't depend on low-level details
- **Testability**: Each component can be tested in isolation

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

Apache-2.0
