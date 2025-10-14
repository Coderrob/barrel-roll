# Architecture

This document describes the architecture of the Barrel Roll VS Code extension.

## Overview

Barrel Roll follows SOLID principles with clean separation of concerns. The extension is structured to be maintainable, testable, and extensible.

## Project Structure

```
barrel-roll/
├── src/
│   ├── extension.ts                      # Extension entry point
│   ├── barrelFileGenerator.ts            # Main orchestrator
│   ├── services/                         # Service layer
│   │   ├── fileSystemService.ts          # File I/O operations
│   │   ├── exportParser.ts               # Export extraction logic
│   │   └── barrelContentBuilder.ts       # Content generation
│   └── test/                             # Test suite
│       ├── runTest.ts                    # Test runner
│       └── suite/                        # Test cases
│           ├── exportParser.test.ts
│           ├── barrelContentBuilder.test.ts
│           └── barrelFileGenerator.test.ts
├── .vscode/                              # VS Code workspace config
├── .github/workflows/                    # CI/CD pipelines
├── dist/                                 # Webpack bundled output
└── out/                                  # TypeScript compiled output

```

## Core Components

### 1. Extension Entry Point (`extension.ts`)

**Responsibility**: Extension lifecycle management and command registration

- Activates the extension
- Registers the `barrel-roll.generateBarrel` command
- Provides user feedback through VS Code notifications

**Code Stats**: ~25 lines

### 2. Barrel File Generator (`barrelFileGenerator.ts`)

**Responsibility**: Orchestrate the barrel file generation process

**Pattern**: Facade/Orchestrator pattern
- Coordinates between services
- Implements dependency injection for testability
- Handles the main workflow:
  1. Get TypeScript files from directory
  2. Parse exports from each file
  3. Build barrel file content
  4. Write the barrel file

**Code Stats**: ~60 lines

### 3. Service Layer

#### FileSystemService (`services/fileSystemService.ts`)

**Responsibility**: File system operations

**SOLID Principle**: Single Responsibility - handles only file I/O

**Methods**:
- `getTypeScriptFiles(directoryPath)`: Lists .ts files (excluding index.ts)
- `readFile(filePath)`: Reads file content
- `writeFile(filePath, content)`: Writes file content

**Error Handling**: Wraps fs operations with descriptive error messages

**Code Stats**: ~60 lines

#### ExportParser (`services/exportParser.ts`)

**Responsibility**: Extract TypeScript exports from source code

**SOLID Principle**: Single Responsibility - handles only export parsing

**Features**:
- Detects named exports (class, interface, type, function, const, enum)
- Detects default exports
- Handles export lists `export { A, B }`
- Handles renamed exports `export { A as B }`
- Removes comments to avoid false matches
- Deduplicates export names

**Methods**:
- `extractExports(content)`: Main export extraction logic
- `removeComments(content)`: Helper to strip comments

**Code Stats**: ~70 lines

#### BarrelContentBuilder (`services/barrelContentBuilder.ts`)

**Responsibility**: Build formatted barrel file content

**SOLID Principle**: Single Responsibility - handles only content generation

**Features**:
- Filters parent folder references
- Sorts files alphabetically for consistency
- Handles default exports separately
- Generates clean, formatted export statements

**Methods**:
- `buildContent(exportsByFile, directoryPath)`: Main content builder
- `getModulePath(filePath)`: Convert file paths to module paths

**Code Stats**: ~80 lines

## Design Patterns

### Dependency Injection

The `BarrelFileGenerator` accepts service instances through its constructor, enabling:
- Easy unit testing with mocks
- Flexibility to swap implementations
- Loose coupling between components

```typescript
constructor(
  fileSystemService?: FileSystemService,
  exportParser?: ExportParser,
  barrelContentBuilder?: BarrelContentBuilder,
)
```

### Separation of Concerns

Each service has a single, well-defined responsibility:
- **FileSystemService**: I/O operations
- **ExportParser**: Code parsing
- **BarrelContentBuilder**: Content generation

This makes the code:
- Easy to test in isolation
- Simple to understand
- Straightforward to modify

### Error Handling

All services throw descriptive errors that bubble up to the extension entry point where they're displayed to the user via VS Code notifications.

## Testing Strategy

### Unit Tests

- **ExportParser**: Tests various export syntax patterns
- **BarrelContentBuilder**: Tests content generation logic

### Integration Tests

- **BarrelFileGenerator**: End-to-end tests with temporary directories

### Coverage

- Tests cover happy paths, edge cases, and error scenarios
- Mock-free integration tests verify real file system operations

## Build Process

### Development

1. **TypeScript Compilation**: `tsc` → `out/` directory
2. **Webpack Bundling**: `webpack` → `dist/extension.js`

### Production

- Webpack in production mode with hidden source maps
- Minified output for distribution
- External dependencies (vscode, path, fs) not bundled

## Extension Activation

The extension uses no `activationEvents` - it activates lazily when needed.

Commands are registered in `contributes.commands` and added to the context menu via `contributes.menus`.

## Future Extensibility

The architecture supports easy additions:

1. **New Export Types**: Extend `ExportParser.extractExports()`
2. **Different Output Formats**: Create new builder implementations
3. **File Filters**: Extend `FileSystemService.getTypeScriptFiles()`
4. **Additional Commands**: Add new commands in `extension.ts`

## Performance Considerations

- **Async Operations**: All file I/O is asynchronous
- **Small Bundle**: Minimal dependencies, ~6KB production bundle
- **No Watchers**: Only runs on explicit user action
- **Efficient Parsing**: Regex-based parsing without AST overhead

## Code Quality

- **TypeScript**: Strict mode enabled
- **Linting**: ESLint with TypeScript rules
- **Formatting**: Prettier for consistent style
- **Documentation**: JSDoc comments on all public methods
