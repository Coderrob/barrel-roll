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

// Note: We define these types inline to avoid runtime resolution of 'vscode'
// module which doesn't exist when running unit tests outside VS Code.
// These are minimal interfaces that match what our tests require.

/**
 * Minimal ExtensionContext interface for unit testing.
 * Only includes properties used by our tests.
 */
export interface ExtensionContext {
  subscriptions: { dispose(): void }[];
}

/**
 * Minimal ProgressOptions interface for unit testing.
 */
export interface ProgressOptions {
  title?: string;
  location: number;
}

export type FakeUri = { fsPath: string };

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
