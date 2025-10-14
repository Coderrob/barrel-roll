import * as vscode from 'vscode';
import { BarrelFileGenerator } from './barrelFileGenerator';

export function activate(context: vscode.ExtensionContext) {
  console.log('Barrel Roll extension is now active');

  const disposable = vscode.commands.registerCommand(
    'barrel-roll.generateBarrel',
    async (uri: vscode.Uri) => {
      try {
        const generator = new BarrelFileGenerator();
        await generator.generateBarrelFile(uri);
        vscode.window.showInformationMessage('Barrel file generated/updated successfully!');
      } catch (error) {
        vscode.window.showErrorMessage(
          `Failed to generate barrel file: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    },
  );

  context.subscriptions.push(disposable);
}

export function deactivate() {}
