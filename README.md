# Barrel Roll

Visual Studio Code extension to automatically export types, functions, constants, and classes through barrel files.

## Features

- **Right-click Generation**: Right-click any folder in the VS Code explorer to generate or update an `index.ts` barrel file
- **Smart Export Detection**: Automatically detects and exports all TypeScript exports (classes, interfaces, types, functions, constants, enums)
- **Clean Architecture**: Follows SOLID principles for maintainability and extensibility
- **Parent Folder Filtering**: Automatically removes re-exports from parent folders
- **Alphabetical Ordering**: Generates consistently ordered exports for better readability

## Installation

### From VS Code Marketplace
1. Open VS Code
2. Go to Extensions (Ctrl+Shift+X / Cmd+Shift+X)
3. Search for "Barrel Roll"
4. Click Install

### From VSIX
1. Download the latest `.vsix` file from the [releases page](https://github.com/Coderrob/barrel-roll/releases)
2. In VS Code, go to Extensions
3. Click the `...` menu and select "Install from VSIX..."
4. Select the downloaded file

## Usage

1. Right-click on any folder in the VS Code explorer
2. Select "Barrel Roll: Generate/Update index.ts"
3. The extension will:
   - Scan all `.ts` files in the folder (excluding `index.ts`)
   - Extract all exported items
   - Generate or update an `index.ts` file with proper exports
   - Filter out any re-exports from parent directories

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

MIT
