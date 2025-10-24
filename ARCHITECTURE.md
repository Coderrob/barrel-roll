# Architecture

This document describes the architecture of the Barrel Roll VS Code extension.

## Overview

Barrel Roll follows SOLID principles with clean separation of concerns. The extension is structured to be maintainable, testable, and extensible.

## Project Structure

```text
barrel-roll/
├── src/
│   ├── extension.ts                      # Extension entry point
│   ├── index.ts                          # Public API exports
│   ├── core/                             # Core barrel generation functionality
│   │   ├── index.ts                      # Core exports
│   │   └── barrel/                       # Barrel-generation modules
│   │       ├── index.ts                  # Barrel exports
│   │       ├── builder/
│   │       │   └── content.builder.ts    # Content generation
│   │       ├── generator/
│   │       │   └── file.generator.ts     # Main orchestrator
│   │       ├── io/
│   │       │   └── file-system.service.ts # File I/O operations
│   │       └── parser/
│   │           └── export.parser.ts      # Export extraction logic
│   ├── logging/                          # Logging infrastructure
│   │   ├── index.ts
│   │   ├── config.ts
│   │   ├── types.ts
│   │   ├── filters/
│   │   │   ├── index.ts
│   │   │   └── log-filters.ts
│   │   ├── loggers/
│   │   │   ├── index.ts
│   │   │   ├── composite.ts
│   │   │   ├── factory.ts
│   │   │   ├── filtered.ts
│   │   │   ├── metrics.ts
│   │   │   ├── mock.ts
│   │   │   └── noop.ts
│   │   └── pino/
│   │       ├── index.ts
│   │       ├── logger.ts
│   │       └── types.ts
│   ├── types/                            # Shared type definitions
│   │   ├── index.ts
│   │   └── env.ts
│   ├── test/                             # Integration tests
│   │   ├── runTest.ts                    # VS Code test runner
│   │   └── suite/                        # Test cases
│   │       ├── index.ts
│   │       ├── barrelContentBuilder.test.ts
│   │       ├── barrelFileGenerator.test.ts
│   │       └── exportParser.test.ts
│   └── __tests__/                        # Jest unit tests
│       ├── jest.setup.ts
│       ├── filters/
│       │   └── log-filters.test.ts
│       └── loggers/
│           ├── composite.logger.test.ts
│           ├── filtered.logger.test.ts
│           ├── logger-config.resolver.test.ts
│           ├── logger.factory.test.ts
│           ├── metrics.logger.test.ts
│           ├── mock.logger.test.ts
│           ├── noop.logger.test.ts
│           └── pino.logger.test.ts
├── audit/                                # Repository audit documentation
│   ├── log.md                            # Audit chronological log
│   └── dependency-graph.md               # Dependency analysis reports
├── .vscode/                              # VS Code workspace config
├── .github/workflows/                    # CI/CD pipelines
└── out/                                  # TypeScript compiled output

```

## Core Components

### 1. Extension Entry Point (`extension.ts`)

**Responsibility**: Extension lifecycle management and command registration

- Activates the extension
- Registers the `barrel-roll.generateBarrel` command
- Provides user feedback through VS Code notifications

**Code Stats**: ~25 lines

### 2. Barrel File Generator (`src/core/barrel/generator/file.generator.ts`)

**Responsibility**: Orchestrate the barrel file generation process

**Pattern**: Facade/Orchestrator pattern

- Coordinates between services
- Implements dependency injection for testability
- Handles the main workflow:
  1. Get TypeScript files from directory
  1. Parse exports from each file
  1. Build barrel file content
  1. Write the barrel file

**Code Stats**: ~60 lines

### 3. Service Layer

#### FileSystemService (`src/core/barrel/io/file-system.service.ts`)

**Responsibility**: File system operations

**SOLID Principle**: Single Responsibility - handles only file I/O

**Methods**:

- `getTypeScriptFiles(directoryPath)`: Lists .ts files (excluding index.ts)
- `readFile(filePath)`: Reads file content
- `writeFile(filePath, content)`: Writes file content

**Error Handling**: Wraps fs operations with descriptive error messages

**Code Stats**: ~60 lines

#### ExportParser (`src/core/barrel/parser/export.parser.ts`)

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

#### BarrelContentBuilder (`src/core/barrel/builder/content.builder.ts`)

**Responsibility**: Generate barrel file content from parsed exports

**SOLID Principle**: Single Responsibility - handles only content generation

**Features**:

- Generates properly formatted export statements
- Sorts exports alphabetically for consistency
- Handles different export types appropriately

**Methods**:

- `buildBarrelContent(exportMap)`: Main content generation logic

**Code Stats**: ~40 lines

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

- **Unit Tests**: Jest-based tests in `src/__tests__/` covering logging, filters, and core services
- **Integration Tests**: VS Code extension tests in `src/test/suite/` verifying end-to-end functionality
- **Test Coverage**: 60% minimum coverage requirement with detailed reporting
- **CI/CD**: Automated testing on push/PR with coverage reporting

## Audit & Quality Assurance

- **Dependency Analysis**: Automated circular dependency detection using `madge` and `dependency-cruiser`
- **Code Quality**: ESLint rules for import/export consistency and unused code detection
- **Repository Standards**: Adherence to SOLID principles, clean architecture, and refactoring guidelines
- **Audit Documentation**: Ongoing audit log in `audit/log.md` with dependency graphs and remediation plans

## Build Process

### Development

1. **TypeScript Compilation**: `tsc` → `out/` directory

### Production

- Webpack in production mode with hidden source maps
- Minified output for distribution
- External dependencies (vscode, path, fs) not bundled

## Extension Activation

The extension uses no `activationEvents` - it activates lazily when needed.

Commands are registered in `contributes.commands` and added to the context menu via `contributes.menus`.

## Future Extensibility

The architecture supports easy additions:

- **New Export Types**: Extend `ExportParser.extractExports()`
- **Different Output Formats**: Create new builder implementations
- **File Filters**: Extend `FileSystemService.getTypeScriptFiles()`
- **Additional Commands**: Add new commands in `extension.ts`

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
