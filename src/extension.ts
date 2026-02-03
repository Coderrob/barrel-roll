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

import * as path from 'node:path';

import * as vscode from 'vscode';

import { BarrelFileGenerator } from './core/barrel/barrel-file.generator.js';
import { OutputChannelLogger } from './logging/output-channel.logger.js';
import { BarrelGenerationMode, type IBarrelGenerationOptions } from './types/index.js';
import { getErrorMessage } from './utils/index.js';

type CommandDescriptor = {
  id: string;
  options: IBarrelGenerationOptions;
  progressTitle: string;
  successMessage: string;
};

/**
 * Simple queue to prevent concurrent barrel generation operations.
 */
class BarrelCommandQueue {
  private readonly queue: Array<() => Promise<void>> = [];
  private isProcessing = false;

  /**
   * Enqueues an operation to be executed sequentially.
   * @param operation The operation to enqueue.
   * @returns Promise that resolves when the operation completes.
   */
  async enqueue(operation: () => Promise<void>): Promise<void> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          await operation();
          resolve();
        } catch (error) {
          reject(error);
        }
      });
      void this.processQueue();
    });
  }

  /**
   * Processes the queue of operations sequentially.
   * @returns Promise that resolves when the queue is empty.
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0) {
      return;
    }

    this.isProcessing = true;

    while (this.queue.length > 0) {
      const operation = this.queue.shift()!;
      try {
        await operation();
      } catch (error) {
        // Log error but continue processing queue
        console.error('Barrel command failed:', error);
      }
    }

    this.isProcessing = false;
  }
}

const commandQueue = new BarrelCommandQueue();

/**
 * Activates the Barrel Roll extension.
 * @param context The extension context provided by VS Code.
 */
export function activate(context: vscode.ExtensionContext) {
  console.log('Barrel Roll extension is now active');

  const outputChannel = vscode.window.createOutputChannel('Barrel Roll');
  context.subscriptions.push(outputChannel);
  OutputChannelLogger.configureOutputChannel(outputChannel);
  outputChannel.appendLine('Barrel Roll: logging initialized');

  const generator = new BarrelFileGenerator();

  const descriptors: CommandDescriptor[] = [
    {
      id: 'barrel-roll.generateBarrel',
      options: {
        recursive: false,
        mode: BarrelGenerationMode.CreateOrUpdate,
      },
      progressTitle: 'Barrel Roll: Updating barrel...',
      successMessage: 'Barrel Roll: index.ts updated.',
    },
    {
      id: 'barrel-roll.generateBarrelRecursive',
      options: {
        recursive: true,
        mode: BarrelGenerationMode.CreateOrUpdate,
      },
      progressTitle: 'Barrel Roll: Updating barrels recursively...',
      successMessage: 'Barrel Roll: index.ts files updated recursively.',
    },
  ];

  for (const descriptor of descriptors) {
    const disposable = registerBarrelCommand(generator, descriptor);
    context.subscriptions.push(disposable);
  }
}

/**
 * Deactivates the Barrel Roll extension.
 */
export function deactivate(): void {
  /* no-op */
}

/**
 * Registers a barrel generation command with VS Code.
 * @param generator The barrel file generator instance.
 * @param descriptor The command descriptor containing options and messages.
 * @returns A disposable for the registered command.
 */
function registerBarrelCommand(
  generator: BarrelFileGenerator,
  descriptor: CommandDescriptor,
): vscode.Disposable {
  return vscode.commands.registerCommand(descriptor.id, async (uri?: vscode.Uri) => {
    try {
      const targetDirectory = await resolveTargetDirectory(uri);
      if (!targetDirectory) {
        return;
      }

      await commandQueue.enqueue(async () => {
        await withProgress(descriptor.progressTitle, async () => {
          await generator.generateBarrelFile(targetDirectory, descriptor.options);
        });
      });

      vscode.window.showInformationMessage(descriptor.successMessage);
    } catch (error) {
      const message = getErrorMessage(error);
      vscode.window.showErrorMessage(`Barrel Roll: ${message}`);
    }
  });
}

/**
 * Resolves the target directory for barrel generation from the provided URI or user prompt.
 * @param uri Optional URI from the command invocation.
 * @returns Promise that resolves to the target directory URI, or undefined if cancelled.
 */
async function resolveTargetDirectory(uri?: vscode.Uri): Promise<vscode.Uri | undefined> {
  const initial = uri ?? (await promptForDirectory());
  if (!initial) {
    return undefined;
  }

  return ensureDirectoryUri(initial);
}

/**
 * Prompts the user to select a directory for barrel generation.
 * @returns Promise that resolves to the selected directory URI, or undefined if cancelled.
 */
async function promptForDirectory(): Promise<vscode.Uri | undefined> {
  const selected = await vscode.window.showOpenDialog({
    canSelectFiles: false,
    canSelectFolders: true,
    canSelectMany: false,
    openLabel: 'Select folder to barrel',
  });

  if (!selected || selected.length === 0) {
    return undefined;
  }

  return selected[0];
}

/**
 * Ensures the provided URI points to a directory, converting file URIs to their parent directory.
 * @param uri The URI to validate and potentially convert.
 * @returns Promise that resolves to a directory URI, or undefined if validation fails.
 */
async function ensureDirectoryUri(uri: vscode.Uri): Promise<vscode.Uri | undefined> {
  try {
    const stat = await vscode.workspace.fs.stat(uri);
    if (stat.type === vscode.FileType.Directory) {
      return uri;
    }
    if (stat.type === vscode.FileType.File) {
      return vscode.Uri.file(path.dirname(uri.fsPath));
    }
  } catch (error) {
    const message = getErrorMessage(error);
    throw new Error(`Unable to access selected resource: ${message}`);
  }

  return uri;
}

/**
 * Executes a task with VS Code progress indication.
 * @param title The progress title to display.
 * @param task The async task to execute.
 * @returns Promise that resolves when the task completes.
 */
async function withProgress<T>(title: string, task: () => Promise<T>): Promise<T> {
  return vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Window,
      title,
    },
    task,
  );
}
