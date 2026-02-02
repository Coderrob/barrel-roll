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
import * as path from 'node:path';
import { beforeEach, describe, it, mock } from 'node:test';
import type {
  FakeUri,
  CommandHandler,
  TestWindowApi,
  TestCommandsApi,
  ActivateFn,
  DeactivateFn,
} from './test/testTypes.js';
import { uriFile } from './test/testTypes.js';
import { BarrelGenerationMode } from './types/index.js';
import type { ExtensionContext, ProgressOptions } from 'vscode';

/**
 * Creates a mock ExtensionContext for testing.
 */
function createContext(): ExtensionContext {
  const base = { subscriptions: [] as unknown[] };
  return base as unknown as ExtensionContext;
}

describe('Extension', () => {
  type ProgressCall = {
    options: ProgressOptions;
  };

  const commandHandlers = new Map<string, CommandHandler>();
  let createOutputChannelCalls: string[];
  let createdOutputChannels: Array<{ appendLine: (value: string) => void }>;
  let outputChannelMessages: string[];
  let informationMessages: string[];
  let errorMessages: string[];
  let progressCalls: ProgressCall[];
  let showOpenDialogResult: FakeUri[] | undefined;
  let showOpenDialogCalls: number;
  let workspaceStatImpl: (uri: FakeUri) => Promise<{ type: number }>;
  let configuredOutputChannel: { appendLine: (value: string) => void } | undefined;
  const generatorInstances: FakeBarrelFileGenerator[] = [];
  let generatorFailure: unknown;

  const FileType = {
    Unknown: 0,
    File: 1,
    Directory: 2,
    SymbolicLink: 64,
  } satisfies Record<string, number>;

  const ProgressLocation = {
    Window: 10,
  };

  const windowApi: TestWindowApi = {
    createOutputChannel(name: string) {
      createOutputChannelCalls.push(name);
      const channel = {
        appendLine(value: string) {
          outputChannelMessages.push(value);
        },
      };
      createdOutputChannels.push(channel);
      return channel;
    },
    showInformationMessage(message: string) {
      informationMessages.push(message);
      return undefined;
    },
    showErrorMessage(message: string) {
      errorMessages.push(message);
      return undefined;
    },
    async showOpenDialog() {
      showOpenDialogCalls += 1;
      return showOpenDialogResult;
    },
    async withProgress<T>(options: ProgressOptions, task: () => Promise<T>) {
      progressCalls.push({ options });
      return task();
    },
  };

  const commandsApi: TestCommandsApi = {
    registerCommand(command: string, handler: CommandHandler): { dispose(): void } {
      commandHandlers.set(command, handler);
      return {
        dispose() {
          commandHandlers.delete(command);
        },
      };
    },
  };

  const uriApi: { file(fsPath: string): FakeUri } = {
    file(fsPath: string): FakeUri {
      return uriFile(fsPath);
    },
  };

  const workspaceApi: { fs: { stat(uri: FakeUri): Promise<{ type: number }> } } = {
    fs: {
      stat(uri: FakeUri) {
        return workspaceStatImpl(uri);
      },
    },
  };

  class FakeBarrelFileGenerator {
    public readonly calls: Array<{ targetDirectory: FakeUri; options: unknown }> = [];

    /**
     * Constructor for the fake barrel file generator used in tests.
     */
    constructor() {
      generatorInstances.push(this);
    }

    /**
     * Fake implementation of generateBarrelFile for testing purposes.
     */
    async generateBarrelFile(targetDirectory: FakeUri, options: unknown): Promise<void> {
      this.calls.push({ targetDirectory, options });
      if (generatorFailure) {
        throw generatorFailure;
      }
    }
  }

  class PinoLoggerStub {
    /**
     *
     */
    static configureOutputChannel(
      channel: { appendLine: (value: string) => void } | undefined,
    ): void {
      configuredOutputChannel = channel;
    }
  }

  mock.module('vscode', {
    namedExports: {
      Uri: uriApi,
      FileType,
      ProgressLocation,
      window: windowApi,
      commands: commandsApi,
      workspace: workspaceApi,
    },
  });

  mock.module('./core/barrel/barrel-file.generator.js', {
    namedExports: {
      BarrelFileGenerator: FakeBarrelFileGenerator,
    },
  });

  mock.module('./logging/pino.logger.js', {
    namedExports: {
      PinoLogger: PinoLoggerStub,
    },
  });

  let activate: ActivateFn;
  let deactivate: DeactivateFn;

  /**
   *
   */
  function resetState(): void {
    commandHandlers.clear();
    createOutputChannelCalls = [];
    createdOutputChannels = [];
    outputChannelMessages = [];
    informationMessages = [];
    errorMessages = [];
    progressCalls = [];
    showOpenDialogResult = undefined;
    showOpenDialogCalls = 0;
    workspaceStatImpl = async () => ({ type: FileType.Directory });
    configuredOutputChannel = undefined;
    generatorInstances.length = 0;
    generatorFailure = undefined;
  }

  beforeEach(async () => {
    resetState();
    ({ activate, deactivate } = await import('./extension.js'));
  });

  /**
   *
   */
  function getCommand(id: string): CommandHandler {
    const handler = commandHandlers.get(id);
    assert.ok(handler, `Command ${id} was not registered`);
    return handler;
  }

  /**
   *
   */
  function lastGeneratorCall(): { targetDirectory: FakeUri; options: unknown } {
    assert.ok(generatorInstances.length > 0, 'No generator instances were created');
    const instance = generatorInstances.at(-1)!;
    assert.ok(instance.calls.length > 0, 'Generator was not invoked');
    return instance.calls.at(-1)!;
  }

  describe('extension activation', () => {
    it('should register commands and configure logging', async () => {
      const context = createContext();

      await activate(context);

      assert.deepStrictEqual(createOutputChannelCalls, ['Barrel Roll']);
      assert.strictEqual(configuredOutputChannel, createdOutputChannels[0]);
      assert.deepStrictEqual(outputChannelMessages, ['Barrel Roll: logging initialized']);
      assert.deepStrictEqual(Array.from(commandHandlers.keys()), [
        'barrel-roll.generateBarrel',
        'barrel-roll.generateBarrelRecursive',
      ]);
      assert.strictEqual(context.subscriptions.length, 3);
      assert.strictEqual(context.subscriptions[0], createdOutputChannels[0]);

      deactivate();
    });

    it('should generate a barrel when the command is invoked with a directory', async () => {
      await activate(createContext());

      const command = getCommand('barrel-roll.generateBarrel');
      const uri = uriApi.file('C:/workspace/src');

      await command(uri);

      const call = lastGeneratorCall();
      assert.deepStrictEqual(call, {
        targetDirectory: uri,
        options: {
          recursive: false,
          mode: BarrelGenerationMode.CreateOrUpdate,
        },
      });
      assert.deepStrictEqual(
        progressCalls.map((entry) => entry.options.title),
        ['Barrel Roll: Updating barrel...'],
      );
      assert.deepStrictEqual(informationMessages, ['Barrel Roll: index.ts updated.']);
      assert.deepStrictEqual(errorMessages, []);
    });

    it('should use the folder picker when no URI is provided', async () => {
      await activate(createContext());

      const command = getCommand('barrel-roll.generateBarrel');
      const selected = uriApi.file('C:/projects/chosen');
      showOpenDialogResult = [selected];

      await command();

      const call = lastGeneratorCall();
      assert.strictEqual(call.targetDirectory, selected);
      assert.strictEqual(showOpenDialogCalls, 1);
    });

    it('should not run when folder selection is cancelled', async () => {
      await activate(createContext());

      const command = getCommand('barrel-roll.generateBarrel');
      showOpenDialogResult = undefined;

      await command();

      assert.strictEqual(generatorInstances.length, 0);
      assert.deepStrictEqual(informationMessages, []);
      assert.deepStrictEqual(errorMessages, []);
      assert.strictEqual(showOpenDialogCalls, 1);
    });

    it('should resolve file URIs to their parent directory', async () => {
      await activate(createContext());

      workspaceStatImpl = async () => ({ type: FileType.File });
      const command = getCommand('barrel-roll.generateBarrelRecursive');
      const fileUri = uriApi.file('C:/workspace/src/file.ts');

      await command(fileUri);

      const call = lastGeneratorCall();
      assert.strictEqual(call.targetDirectory.fsPath, path.normalize('C:/workspace/src'));
    });

    it('should return the original URI when the resource type is unknown', async () => {
      await activate(createContext());

      workspaceStatImpl = async () => ({ type: FileType.SymbolicLink });
      const command = getCommand('barrel-roll.generateBarrel');
      const dirUri = uriApi.file('C:/repo/src');

      await command(dirUri);

      const call = lastGeneratorCall();
      assert.strictEqual(call.targetDirectory, dirUri);
    });

    it('should surface errors from the generator', async () => {
      await activate(createContext());

      const command = getCommand('barrel-roll.generateBarrel');
      const uri = uriApi.file('C:/repo/src');
      generatorFailure = new Error('generation failed');

      await command(uri);

      assert.deepStrictEqual(errorMessages, ['Barrel Roll: generation failed']);
      assert.deepStrictEqual(informationMessages, []);
    });

    it('should wrap stat errors in a friendly message', async () => {
      await activate(createContext());

      const command = getCommand('barrel-roll.generateBarrel');
      const uri = uriApi.file('C:/repo/src');
      workspaceStatImpl = async () => {
        throw new Error('permission denied');
      };

      await command(uri);

      assert.deepStrictEqual(errorMessages, [
        'Barrel Roll: Unable to access selected resource: permission denied',
      ]);
      assert.strictEqual(generatorInstances.length, 0);
    });
  });
});
