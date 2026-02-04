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
export type { LoggerConstructor, LoggerInstance } from '../types/index.js';
