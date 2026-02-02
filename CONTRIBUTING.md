# Contributing to Barrel Roll

Thank you for your interest in contributing to Barrel Roll! This document provides guidelines and instructions for contributing.

## Development Setup

1. **Fork and Clone**

   ```bash
   git clone https://github.com/YOUR_USERNAME/barrel-roll.git
   cd barrel-roll
   ```

1. **Install Dependencies**

   ```bash
   npm install
   ```

1. **Build the Extension**

   ```bash
   npm run compile
   ```

## Development Workflow

### Running the Extension Locally

1. Open the project in VS Code
1. Press F5 to start debugging
1. A new VS Code window will open with the extension loaded
1. Right-click on any folder in the file explorer to test the "Barrel Roll: Generate/Update index.ts" command

### Making Changes

1. Create a new branch for your feature or bug fix:

   ```bash
   git checkout -b feature/your-feature-name
   ```

1. Make your changes following the code style guidelines

1. Run linting:

   ```bash
   npm run lint
   npm run lint:fix  # Auto-fix issues
   ```

1. Run formatting:

   ```bash
   npm run format
   ```

1. Write tests for your changes (if applicable)

1. Run tests:

   ```bash
   npm test
   ```

## Code Style

- **TypeScript**: Follow the existing TypeScript patterns
- **SOLID Principles**: Maintain separation of concerns
- **Formatting**: Use Prettier (configuration in `.prettierrc.json`)
- **Linting**: Follow ESLint rules (configuration in `.eslintrc.json`)

### Architecture Guidelines

The extension follows SOLID principles with clear separation of concerns:

- **Services**: Each service should have a single responsibility
  - `FileSystemService`: File I/O operations
  - `ExportParser`: Parsing TypeScript exports
  - `BarrelContentBuilder`: Building barrel file content

- **Main Logic**: `BarrelFileGenerator` orchestrates the services

- **Testing**: Write unit tests for individual services and integration tests for the main generator

## Testing

- Unit tests are located in `src/test/suite/`
- Follow the existing test patterns using Mocha
- Aim for high code coverage
- Test both success and error cases

## Commit Messages

Follow conventional commit format:

- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation changes
- `test:` Adding or updating tests
- `refactor:` Code refactoring
- `chore:` Maintenance tasks

Example:

```
feat: add support for default exports
```

## Pull Request Process

1. Ensure all tests pass
1. Update documentation if needed
1. Update CHANGELOG.md with your changes
1. Submit a pull request with a clear description of the changes

## Questions?

Feel free to open an issue for any questions or concerns.

## Coding conventions: error handling

- Prefer the shared helpers in `src/utils/errors.ts`:
  - `getErrorMessage(error)` — safe extraction of an error message
  - `formatErrorForLog(error)` — prefer when logging since it preserves stack when available

- To catch and automatically correct ad-hoc checks like `error instanceof Error ? error.message : String(error)` run:
  - `npm run lint:fix` (uses ESLint auto-fix where applicable)
  - `npm run fix:instanceof-error` (codemod using `jscodeshift` for larger-scale replacements)

If you want to add more auto-fix patterns, please open an issue or PR so we can review and add targeted rules/codemods.
