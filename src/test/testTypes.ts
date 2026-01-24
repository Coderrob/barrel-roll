import * as path from 'node:path';

import type { ExtensionContext, ProgressOptions, Uri as VsCodeUri } from 'vscode';

export type FakeUri = Pick<VsCodeUri, 'fsPath'>;

/**
 *
 */
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

// Minimal runtime shape for the OutputChannelLogger class used in tests
export interface LoggerInstance {
  isLoggerAvailable(): boolean;
  info(message: string, metadata?: Record<string, unknown>): void;
  debug(message: string, metadata?: Record<string, unknown>): void;
  warn(message: string, metadata?: Record<string, unknown>): void;
  error(message: string, metadata?: Record<string, unknown>): void;
  fatal(message: string, metadata?: Record<string, unknown>): void;
  group?<T>(name: string, fn: () => Promise<T>): Promise<T>;
  child?(bindings: Record<string, unknown>): LoggerInstance;
}

export interface LoggerConstructor {
  new (...args: unknown[]): LoggerInstance;
  configureOutputChannel(channel?: { appendLine(value: string): void }): void;
}
