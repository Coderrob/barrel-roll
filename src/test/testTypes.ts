import * as path from 'node:path';

import type { ExtensionContext, ProgressOptions, Uri as VsCodeUri } from 'vscode';

export type FakeUri = Pick<VsCodeUri, 'fsPath'>;

export function uriFile(fsPath: string): FakeUri {
  return { fsPath: path.normalize(fsPath) };
}

export type CommandHandler = (uri?: FakeUri) => unknown;

export type TestWindowApi = {
  createOutputChannel(name: string): { appendLine(value: string): void };
  showInformationMessage(message: string): unknown;
  showErrorMessage(message: string): unknown;
  showOpenDialog(): Promise<FakeUri[] | undefined>;
  withProgress<T>(options: ProgressOptions, task: () => Promise<T>): Promise<T>;
};

export type TestCommandsApi = {
  registerCommand(command: string, handler: CommandHandler): { dispose(): void };
};

export type TestWorkspaceApi = { fs: { stat(uri: FakeUri): Promise<{ type: number }> } };

export type ActivateFn = (context: ExtensionContext) => Promise<void> | void;
export type DeactivateFn = () => void;
