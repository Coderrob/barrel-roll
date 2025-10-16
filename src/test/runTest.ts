import * as path from 'path';
import { fileURLToPath } from 'url';

import { runTests } from '@vscode/test-electron';

async function main(): Promise<void> {
  try {
    if (process.platform.startsWith('win')) {
      console.warn(
        'VS Code integration tests are temporarily skipped on Windows because the Code executable rejects required CLI flags.',
      );
      return;
    }

    // The folder containing the Extension Manifest package.json
    // Passed to `--extensionDevelopmentPath`
    const extensionDevelopmentPath = path.resolve(
      path.dirname(fileURLToPath(import.meta.url)),
      '../../',
    );

    // The path to test runner
    // Passed to --extensionTestsPath
    const extensionTestsPath = path.resolve(
      path.dirname(fileURLToPath(import.meta.url)),
      './suite/index',
    );

    // Download VS Code, unzip it and run the integration test
    const options: Parameters<typeof runTests>[0] = {
      extensionDevelopmentPath,
      extensionTestsPath,
    };

    if (process.platform === 'win32') {
      options.launchArgs = [];
    }

    await runTests(options);
  } catch (error) {
    console.error('Failed to run tests:', error);
    process.exit(1);
  }
}

main();
