import * as path from 'path';

import * as vscode from 'vscode';

import {
  BarrelFileGenerator,
  type BarrelGenerationOptions,
} from './core/services/barrel-file.generator';
import { PinoLogger } from './logging/pino/logger.js';

type CommandDescriptor = {
  id: string;
  options: BarrelGenerationOptions;
  progressTitle: string;
  successMessage: string;
};

export function activate(context: vscode.ExtensionContext) {
  console.log('Barrel Roll extension is now active');

  const outputChannel = vscode.window.createOutputChannel('Barrel Roll');
  context.subscriptions.push(outputChannel);
  PinoLogger.configureOutputChannel(outputChannel);
  outputChannel.appendLine('Barrel Roll: logging initialized');

  const generator = new BarrelFileGenerator();

  const descriptors: CommandDescriptor[] = [
    {
      id: 'barrel-roll.generateBarrel',
      options: { recursive: false, mode: 'createOrUpdate' },
      progressTitle: 'Barrel Roll: Generating barrel...',
      successMessage: 'Barrel Roll: barrel file generated successfully.',
    },
    {
      id: 'barrel-roll.generateBarrelRecursive',
      options: { recursive: true, mode: 'createOrUpdate' },
      progressTitle: 'Barrel Roll: Generating barrels recursively...',
      successMessage: 'Barrel Roll: barrel files generated recursively.',
    },
    {
      id: 'barrel-roll.updateBarrel',
      options: { recursive: true, mode: 'updateExisting' },
      progressTitle: 'Barrel Roll: Updating barrels...',
      successMessage: 'Barrel Roll: barrel files sanitized successfully.',
    },
  ];

  for (const descriptor of descriptors) {
    const disposable = registerBarrelCommand(generator, descriptor);
    context.subscriptions.push(disposable);
  }
}

export function deactivate() {}

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
      const message = error instanceof Error ? error.message : String(error);
      vscode.window.showErrorMessage(`Barrel Roll: ${message}`);
    }
  });
}

async function resolveTargetDirectory(uri?: vscode.Uri): Promise<vscode.Uri | undefined> {
  const initial = uri ?? (await promptForDirectory());
  if (!initial) {
    return undefined;
  }

  return ensureDirectoryUri(initial);
}

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
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Unable to access selected resource: ${message}`);
  }

  return uri;
}

async function withProgress<T>(title: string, task: () => Promise<T>): Promise<T> {
  return vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Window,
      title,
    },
    task,
  );
}
