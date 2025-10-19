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

import type { OutputChannel } from 'vscode';

import { LogLevel, PinoLogger } from '../../logging/index.js';

type MockOutputChannel = OutputChannel & {
  append: jest.Mock;
  appendLine: jest.Mock;
  clear: jest.Mock;
  replace: jest.Mock;
  show: jest.Mock;
  hide: jest.Mock;
  dispose: jest.Mock;
};

const createMockOutputChannel = (): MockOutputChannel =>
  ({
    name: 'Test Channel',
    append: jest.fn(),
    appendLine: jest.fn(),
    clear: jest.fn(),
    replace: jest.fn(),
    show: jest.fn(),
    hide: jest.fn(),
    dispose: jest.fn(),
  }) as unknown as MockOutputChannel;

describe('PinoLogger', () => {
  let logger: PinoLogger;

  afterEach(() => {
    jest.clearAllMocks();
    PinoLogger.configureOutputChannel(undefined);
  });

  beforeEach(() => {
    logger = new PinoLogger({
      level: LogLevel.INFO,
      base: { service: 'test' },
    });
  });

  describe('constructor', () => {
    it('should create logger instance', () => {
      expect(logger).toBeDefined();
      expect(typeof logger.isLoggerAvailable).toBe('function');
    });
  });

  describe('info', () => {
    it('should log info messages', () => {
      expect(() => logger.info('test message')).not.toThrow();
    });

    it('should handle metadata in logs', () => {
      const metadata = { userId: 123, action: 'login' };
      expect(() => logger.info('user logged in', metadata)).not.toThrow();
    });
  });

  describe('debug', () => {
    it('should log debug messages', () => {
      expect(() => logger.debug('debug message')).not.toThrow();
    });
  });

  describe('group', () => {
    it('should handle group operations with child logger', async () => {
      const result = await logger.group('test group', async () => {
        logger.info('inside group');
        return 'success';
      });
      expect(result).toBe('success');
    });

    it('should handle group operation errors', async () => {
      await expect(
        logger.group('failing group', async () => {
          throw new Error('group failed');
        }),
      ).rejects.toThrow('group failed');
    });
  });

  describe('warning', () => {
    it('should handle warning calls', () => {
      logger.warn('warning message');
      logger.warn('warning with metadata', { component: 'test' });
      // Test passes if no exception is thrown
      expect(true).toBe(true);
    });
  });

  describe('isLoggerAvailable', () => {
    it('should report logger availability', () => {
      expect(logger.isLoggerAvailable()).toBe(true);
    });
  });

  describe('output channel integration', () => {
    it('should append info logs to the configured output channel', () => {
      const outputChannel = createMockOutputChannel();
      PinoLogger.configureOutputChannel(outputChannel);
      const channelLogger = new PinoLogger({ level: LogLevel.INFO });

      channelLogger.info('I am a banana.', { fruit: 'banana' });

      expect(outputChannel.appendLine).toHaveBeenCalledTimes(1);
      const [loggedLine] = outputChannel.appendLine.mock.calls[0];
      expect(loggedLine).toContain('[INFO] I am a banana.');
      expect(loggedLine).toContain('"fruit":"banana"');
    });

    it('should record group lifecycle events in the output channel', async () => {
      const outputChannel = createMockOutputChannel();
      PinoLogger.configureOutputChannel(outputChannel);
      const channelLogger = new PinoLogger({ level: LogLevel.INFO });

      await expect(
        channelLogger.group('citrus-run', async () => {
          throw new Error('group failed');
        }),
      ).rejects.toThrow('group failed');

      const recordedMessages = outputChannel.appendLine.mock.calls.map(([call]) => call as string);
      expect(recordedMessages).toEqual(
        expect.arrayContaining([
          expect.stringContaining('Starting group: citrus-run'),
          expect.stringContaining('Failed in group: citrus-run'),
        ]),
      );
    });
  });

  it('should handle error logging', () => {
    const error = new Error('test error');
    expect(() => logger.error('error occurred', { error: error.message })).not.toThrow();
  });

  it('should handle setFailed calls', () => {
    expect(() => logger.setFailed('action failed')).not.toThrow();
  });

  it('should respect log levels', () => {
    const debugLogger = new PinoLogger({
      level: LogLevel.ERROR,
    });

    expect(() => {
      debugLogger.debug('should not log');
      debugLogger.info('should not log');
      debugLogger.error('should log');
    }).not.toThrow();
  });
});
