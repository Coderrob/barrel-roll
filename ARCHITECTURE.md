# Architecture

This document describes the current architecture of the Barrel Roll VS Code extension.

## Overview

Barrel Roll is organized around focused services and thin integration layers:

- command registration and UX flow in `src/extension.ts`
- barrel generation orchestration in `src/core/barrel/barrel-file.generator.ts`
- export parsing in `src/core/parser/export.parser.ts`
- file system access in `src/core/io/file-system.service.ts`
- deterministic output construction in `src/core/barrel/barrel-content.builder.ts`
- update sanitization in `src/core/barrel/content-sanitizer.ts`
- parse-result caching in `src/core/barrel/export-cache.ts`

The design emphasizes separation of concerns, deterministic output, and testability.

## Project structure (current)

```text
src/
  extension.ts                 # VS Code activation and command wiring
  core/
    barrel/
      barrel-file.generator.ts # Main orchestrator
      barrel-content.builder.ts
      content-sanitizer.ts
      export-cache.ts
      export-patterns.ts
    io/
      file-system.service.ts
    parser/
      export.parser.ts
  logging/
    output-channel.logger.ts
  test/
    unit/**                    # Unit tests
    integration/**             # Integration tests
    testHarness.ts             # Node test setup
    runTest.ts                 # VS Code integration entry point
  types/
  utils/
```

## Command and execution model

Two commands are contributed in `package.json` and registered in `src/extension.ts`:

- `barrel-roll.generateBarrel`
- `barrel-roll.generateBarrelRecursive`

Both commands share the same generator instance. A lightweight in-memory queue serializes execution to avoid concurrent writes when commands are triggered rapidly.

## High-level flow

1. A VS Code command is triggered.
1. `src/extension.ts` resolves the target folder URI.
1. `BarrelFileGenerator` reads TypeScript files and subdirectories.
1. `ExportCache` returns cached parse results for unchanged files.
1. `ExportParser` extracts and normalizes export symbols.
1. `BarrelContentBuilder` produces deterministic barrel lines.
1. If `index.ts` exists, `BarrelContentSanitizer` preserves direct declarations and removes stale/duplicate export lines.
1. `FileSystemService` writes final `index.ts` content.

## Core modules

### `src/extension.ts`

- Activates extension services.
- Registers commands and progress notifications.
- Configures output-channel logging.
- Handles friendly user-facing error messages.

### `src/core/barrel/barrel-file.generator.ts`

- Main orchestrator for recursive and non-recursive generation.
- Applies generation options and mode behavior.
- Coordinates file discovery, parsing, content building, and writing.
- Supports merge behavior for existing barrels via sanitizer.

### `src/core/barrel/export-cache.ts`

- Caches parsed exports by file path + `mtime`.
- Avoids repeat parsing during recursive operations.
- Uses bounded cache size with eviction.

### `src/core/io/file-system.service.ts`

- Handles directory scanning and file reads/writes.
- Filters ignored directories and non-source files.
- Excludes test files and declaration files from barrel export discovery.
- Includes file-size safeguards to avoid pathological reads.

### `src/core/parser/export.parser.ts`

- Extracts export declarations into normalized internal shapes.
- Distinguishes value exports from type-only exports.
- Supports default export detection.

### `src/core/barrel/barrel-content.builder.ts`

- Produces sorted, stable export output.
- Ensures consistent formatting for type/value/default exports.

### `src/core/barrel/content-sanitizer.ts`

- Preserves direct definitions already present in `index.ts`.
- Sanitizes conflicting or stale re-export lines during updates.

## Testing architecture

- Test execution uses Node's built-in test runner via `scripts/run-tests.cjs`.
- Unit tests: `src/test/unit/**`
- Integration tests: `src/test/integration/**`
- VS Code integration entrypoint: `src/test/runTest.ts`
- Shared test helpers: `src/test/testTypes.ts`

## Build and packaging

- Compile bundle: webpack (`webpack.config.cjs`) -> `dist/extension.js`
- VSIX packaging: `@vscode/vsce`
- Publish allowlist controlled by `.vscodeignore`

## Design constraints and trade-offs

- Deterministic output ordering to reduce diff noise.
- Safe updates that preserve direct declarations in existing barrels.
- Serialized command execution to avoid write races.
- Lightweight parsing/caching balance for speed in larger trees.
- Minimal publish surface in VSIX artifacts.

## Extensibility points

- Add export grammar support in `src/core/parser/export.parser.ts`.
- Adjust formatting/output policy in `src/core/barrel/barrel-content.builder.ts`.
- Extend sanitization policy in `src/core/barrel/content-sanitizer.ts`.
- Add generation modes/options in `src/types/` and `src/core/barrel/barrel-file.generator.ts`.
