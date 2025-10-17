import * as path from 'path';
import { fileURLToPath } from 'url';

import { runTests } from '@vscode/test-electron';

async function main(): Promise<void> {
  try {
    const shouldSkipTests = shouldSkipVscodeTests();

    if (shouldSkipTests) {
      console.log('Skipping VS Code integration tests in headless/CI/Windows environment');
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
      './suite/index.js',
    );

    // Download VS Code, unzip it and run the integration test
    const options: Parameters<typeof runTests>[0] = {
      extensionDevelopmentPath,
      extensionTestsPath,
      launchArgs: [
        '--no-sandbox',
        '--disable-gpu',
        '--disable-dev-shm-usage',
        '--disable-software-rasterizer',
        '--disable-background-timer-throttling',
        '--disable-renderer-backgrounding',
        '--disable-features=TranslateUI',
        '--disable-ipc-flooding-protection',
        '--disable-extensions-except',
        extensionDevelopmentPath,
        '--disable-extensions',
      ],
    };

    await runTests(options);
  } catch (error) {
    console.error('Failed to run tests:', error);
    process.exit(1);
  }
}

function shouldSkipVscodeTests(): boolean {
  return (
    Boolean(process.env.CI) || !process.stdout.isTTY || process.platform === 'linux'
    // Temporarily allow on Windows to test
    // || process.platform.startsWith('win')
  );
}

main();
