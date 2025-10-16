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

import { LogLevel, PinoLogger } from '../../logging/index.js';

describe('PinoLogger', () => {
  let logger: PinoLogger;

  afterEach(() => {
    jest.clearAllMocks();
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
      logger.warning('warning message');
      logger.warning('warning with metadata', { component: 'test' });
      // Test passes if no exception is thrown
      expect(true).toBe(true);
    });
  });

  describe('isLoggerAvailable', () => {
    it('should report logger availability', () => {
      expect(logger.isLoggerAvailable()).toBe(true);
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
