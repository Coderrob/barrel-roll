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

import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';

import { runTests, type TestOptions } from '@vscode/test-electron';

import { consumeElectronNodeMode, restoreElectronNodeMode } from './test.env.js';

/**
 * Main entry point for running VS Code extension tests.
 */
async function main(): Promise<void> {
  const userDataDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'barrel-roll-vscode-'));
  const inheritedElectronNodeMode = consumeElectronNodeMode();
  try {
    // The folder containing the Extension Manifest package.json
    // Passed to `--extensionDevelopmentPath`
    const extensionDevelopmentPath = path.resolve(__dirname, '../../../');

    // The path to test runner
    // Passed to --extensionTestsPath
    const extensionTestsPath = path.resolve(__dirname, './integration/index.js');

    // Download VS Code, unzip it and run the integration test
    const options: TestOptions = {
      extensionDevelopmentPath,
      extensionTestsPath,
      launchArgs: ['--disable-extensions', '--user-data-dir', userDataDirectory],
    };

    await runTests(options);
  } finally {
    restoreElectronNodeMode(inheritedElectronNodeMode);
    await fs.rm(userDataDirectory, { recursive: true, force: true });
  }
}

void main().catch((error: unknown) => {
  console.error('Failed to run VS Code integration tests:', error);
  process.exit(1);
});
