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
import { afterEach, beforeEach, describe, it, mock } from 'node:test';

import type { OutputChannel } from 'vscode';

import { LogLevel, OutputChannelLogger } from '../../../logging/output-channel.logger.js';

describe('OutputChannelLogger', () => {
  let outputLines: string[];
  let consoleOutput: { level: string; message: string }[];
  let originalConsole: {
    log: typeof console.log;
    debug: typeof console.debug;
    warn: typeof console.warn;
    error: typeof console.error;
  };

  beforeEach(() => {
    outputLines = [];
    consoleOutput = [];

    // Save original console methods
    originalConsole = {
      log: console.log,
      debug: console.debug,
      warn: console.warn,
      error: console.error,
    };

    // Mock console methods
    console.log = mock.fn((...args: unknown[]) => {
      consoleOutput.push({ level: 'info', message: String(args[0]) });
    });
    console.debug = mock.fn((...args: unknown[]) => {
      consoleOutput.push({ level: 'debug', message: String(args[0]) });
    });
    console.warn = mock.fn((...args: unknown[]) => {
      consoleOutput.push({ level: 'warn', message: String(args[0]) });
    });
    console.error = mock.fn((...args: unknown[]) => {
      consoleOutput.push({ level: 'error', message: String(args[0]) });
    });

    OutputChannelLogger.configureOutputChannel({
      appendLine(line: string) {
        outputLines.push(line);
      },
    } as OutputChannel);
  });

  afterEach(() => {
    OutputChannelLogger.configureOutputChannel(undefined);
    // Restore console methods
    console.log = originalConsole.log;
    console.debug = originalConsole.debug;
    console.warn = originalConsole.warn;
    console.error = originalConsole.error;
  });

  it('should report logger as available when output channel is configured', () => {
    const logger = new OutputChannelLogger();
    assert.strictEqual(logger.isLoggerAvailable(), true);
  });

  it('should report logger as available when console is enabled even without output channel', () => {
    OutputChannelLogger.configureOutputChannel(undefined);
    const logger = new OutputChannelLogger({ console: true });
    assert.strictEqual(logger.isLoggerAvailable(), true);
  });

  it('should report logger as unavailable when no output channel and console disabled', () => {
    OutputChannelLogger.configureOutputChannel(undefined);
    const logger = new OutputChannelLogger({ console: false });
    assert.strictEqual(logger.isLoggerAvailable(), false);
  });

  it('should log info messages with metadata', () => {
    const logger = new OutputChannelLogger({ console: false });

    logger.info('initialized', { service: 'barrel' });

    assert.strictEqual(outputLines.length, 1);
    assert.ok(outputLines[0].includes('[INFO] initialized {"service":"barrel"}'));
  });

  it('should log debug messages with timestamp', () => {
    const logger = new OutputChannelLogger({ level: LogLevel.Debug, console: false });

    logger.debug('diagnostic');

    assert.strictEqual(outputLines.length, 1);
    assert.ok(outputLines[0].includes('[DEBUG] diagnostic'));
    assert.ok(/^\d{4}-\d{2}-\d{2}T/.test(outputLines[0]));
  });

  it('should not log debug messages when level is info', () => {
    const logger = new OutputChannelLogger({ level: LogLevel.Info, console: false });

    logger.debug('diagnostic');

    assert.strictEqual(outputLines.length, 0);
  });

  it('should log warnings with metadata', () => {
    const logger = new OutputChannelLogger({ console: false });

    logger.warn('threshold exceeded', { attempt: 3 });

    assert.strictEqual(outputLines.length, 1);
    assert.ok(outputLines[0].includes('[WARN] threshold exceeded {"attempt":3}'));
  });

  it('should normalize errors before logging', () => {
    const logger = new OutputChannelLogger({ console: false });
    const error = new Error('boom');

    logger.error('operation failed', { error });

    assert.strictEqual(outputLines.length, 1);
    assert.ok(outputLines[0].includes('[ERROR] operation failed {"error":"boom"}'));
  });

  it('should prefix fatal messages for action failures', () => {
    const logger = new OutputChannelLogger({ console: false });

    logger.fatal('deploy');

    assert.strictEqual(outputLines.length, 1);
    assert.ok(outputLines[0].includes('[FATAL] Action failed: deploy'));
  });

  it('should skip output channel writes when none is configured', () => {
    OutputChannelLogger.configureOutputChannel(undefined);
    const logger = new OutputChannelLogger({ console: false });

    logger.info('quiet');

    assert.strictEqual(outputLines.length, 0);
  });

  it('should stringify circular metadata safely', () => {
    const logger = new OutputChannelLogger({ console: false });
    const circular: Record<string, unknown> = {};
    circular.self = circular;

    logger.info('circular', circular);

    assert.strictEqual(outputLines.length, 1);
    assert.ok(outputLines[0].includes('[INFO] circular [object Object]'));
  });

  it('should create child logger with inherited bindings', () => {
    const logger = new OutputChannelLogger({ console: false });
    const childLogger = logger.child({ requestId: '123' });

    childLogger.info('child message');

    assert.strictEqual(outputLines.length, 1);
    assert.ok(outputLines[0].includes('{"requestId":"123"}'));
  });

  it('should merge child bindings with log metadata', () => {
    const logger = new OutputChannelLogger({ console: false });
    const childLogger = logger.child({ requestId: '123' });

    childLogger.info('message', { extra: 'data' });

    assert.strictEqual(outputLines.length, 1);
    assert.ok(outputLines[0].includes('"requestId":"123"'));
    assert.ok(outputLines[0].includes('"extra":"data"'));
  });

  it('should log to console when enabled', () => {
    const logger = new OutputChannelLogger({ console: true });

    logger.info('console message');

    assert.strictEqual(consoleOutput.length, 1);
    assert.strictEqual(consoleOutput[0].level, 'info');
  });

  it('should not log to console when disabled', () => {
    const logger = new OutputChannelLogger({ console: false });

    logger.info('quiet message');

    assert.strictEqual(consoleOutput.length, 0);
  });

  it('should execute grouped operations and log start/complete', async () => {
    const logger = new OutputChannelLogger({ console: false });

    const result = await logger.group('build', async () => 42);

    assert.strictEqual(result, 42);
    assert.strictEqual(outputLines.length, 2);
    assert.ok(outputLines[0].includes('Starting group: build'));
    assert.ok(outputLines[1].includes('Completed group: build'));
  });

  it('should log errors from grouped operations', async () => {
    const logger = new OutputChannelLogger({ console: false });
    const failure = new Error('group failure');

    await assert.rejects(
      logger.group('failures', async () => {
        throw failure;
      }),
      (error) => error === failure,
    );

    assert.strictEqual(outputLines.length, 2);
    assert.ok(outputLines[0].includes('Starting group: failures'));
    assert.ok(outputLines[1].includes('[ERROR] Failed in group: failures'));
  });

  it('should use error level for fatal console output', () => {
    const logger = new OutputChannelLogger({ console: true });

    logger.fatal('critical');

    assert.strictEqual(consoleOutput.length, 1);
    assert.strictEqual(consoleOutput[0].level, 'error');
  });

  it('should omit metadata from output when empty', () => {
    const logger = new OutputChannelLogger({ console: false });

    logger.info('no metadata');

    assert.strictEqual(outputLines.length, 1);
    assert.ok(!outputLines[0].includes('{}'));
    assert.ok(outputLines[0].endsWith('no metadata'));
  });
});
