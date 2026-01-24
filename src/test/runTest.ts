import * as os from 'node:os';
import * as path from 'node:path';

import { runTests } from '@vscode/test-electron';

/**
 *
 */
async function main(): Promise<void> {
  try {
    const shouldSkipTests = shouldSkipVscodeTests();

    if (shouldSkipTests) {
      console.log('Skipping VS Code integration tests in headless/CI/Linux environment');
      return;
    }

    // The folder containing the Extension Manifest package.json
    // Passed to `--extensionDevelopmentPath`
    const extensionDevelopmentPath = path.resolve(__dirname, '../../');

    // The path to test runner
    // Passed to --extensionTestsPath
    const extensionTestsPath = path.resolve(__dirname, './suite/index.js');

    // Download VS Code, unzip it and run the integration test
    const options: Parameters<typeof runTests>[0] = {
      extensionDevelopmentPath,
      extensionTestsPath,
      launchArgs: [
        '--no-sandbox',
        '--disable-gpu',
        '--disable-dev-shm-usage',
        '--disable-extensions',
        '--disable-workspace-trust',
        '--user-data-dir',
        path.join(os.tmpdir(), 'vscode-test-user-data'),
      ],
    };

    await runTests(options);
  } catch (error) {
    console.error('Failed to run tests:', error);
    process.exit(1);
  }
}

/**
 *
 */
function shouldSkipVscodeTests(): boolean {
  return Boolean(process.env.CI) || !process.stdout.isTTY || process.platform === 'linux';
}

main();
