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
import assert from 'node:assert/strict';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';

import * as vscode from 'vscode';

const EXTENSION_ID = 'coderrob.barrel-roll';
const GENERATE_BARREL_COMMAND = 'barrel-roll.generateBarrel';
const GENERATE_RECURSIVE_BARREL_COMMAND = 'barrel-roll.generateBarrelRecursive';

/**
 * Verifies every command contributed by the extension is available after activation.
 * @returns Promise that resolves when all expected commands are registered.
 */
async function assertCommandsRegistered(): Promise<void> {
  const registeredCommands = new Set(await vscode.commands.getCommands(true));
  assert.ok(registeredCommands.has(GENERATE_BARREL_COMMAND));
  assert.ok(registeredCommands.has(GENERATE_RECURSIVE_BARREL_COMMAND));
}

/**
 * Exercises activation and barrel generation inside a real VS Code extension host.
 * @returns Promise that resolves when the extension contract passes.
 */
export async function run(): Promise<void> {
  const workspaceDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'barrel-roll-e2e-'));
  try {
    const extension = vscode.extensions.getExtension(EXTENSION_ID);
    assert.ok(extension, `Expected development extension ${EXTENSION_ID} to be installed`);

    await extension.activate();
    assert.strictEqual(extension.isActive, true, 'Expected the extension to activate');
    await assertCommandsRegistered();

    await fs.writeFile(
      path.join(workspaceDirectory, 'alpha.ts'),
      'export const alpha = 1;\nexport interface AlphaOptions {}\n',
      'utf8',
    );
    await vscode.commands.executeCommand(
      GENERATE_BARREL_COMMAND,
      vscode.Uri.file(workspaceDirectory),
    );

    const barrelContent = await fs.readFile(path.join(workspaceDirectory, 'index.ts'), 'utf8');
    assert.strictEqual(barrelContent, "export { alpha, type AlphaOptions } from './alpha.js';\n");
  } finally {
    await fs.rm(workspaceDirectory, { recursive: true, force: true });
  }
}
