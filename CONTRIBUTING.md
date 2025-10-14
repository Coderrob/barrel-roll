# Contributing to Barrel Roll

Thank you for your interest in contributing to Barrel Roll! This document provides guidelines and instructions for contributing.

## Development Setup

1. **Fork and Clone**
   ```bash
   git clone https://github.com/YOUR_USERNAME/barrel-roll.git
   cd barrel-roll
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Build the Extension**
   ```bash
   npm run compile
   ```

## Development Workflow

### Running the Extension Locally

1. Open the project in VS Code
2. Press F5 to start debugging
3. A new VS Code window will open with the extension loaded
4. Right-click on any folder in the file explorer to test the "Barrel Roll: Generate/Update index.ts" command

### Making Changes

1. Create a new branch for your feature or bug fix:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. Make your changes following the code style guidelines

3. Run linting:
   ```bash
   npm run lint
   npm run lint:fix  # Auto-fix issues
   ```

4. Run formatting:
   ```bash
   npm run format
   ```

5. Write tests for your changes (if applicable)

6. Run tests:
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
2. Update documentation if needed
3. Update CHANGELOG.md with your changes
4. Submit a pull request with a clear description of the changes

## Questions?

Feel free to open an issue for any questions or concerns.
