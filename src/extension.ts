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

      await withProgress(descriptor.progressTitle, async () => {
        await generator.generateBarrelFile(targetDirectory, descriptor.options);
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
