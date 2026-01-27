/*
 * Copyright 2025 Robert Lindley
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */

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
