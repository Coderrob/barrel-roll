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

import {
  CompositeLogger,
  ILogger,
  ILogMetadata,
  LogLevel,
  MockLogger,
} from '../../logging/index.js';

describe('CompositeLogger', () => {
  let mockLogger1: MockLogger;
  let mockLogger2: MockLogger;
  let compositeLogger: CompositeLogger;

  afterEach(() => {
    jest.clearAllMocks();
  });

  beforeEach(() => {
    mockLogger1 = new MockLogger();
    mockLogger2 = new MockLogger();
    compositeLogger = new CompositeLogger([mockLogger1, mockLogger2]);
  });

  describe('constructor', () => {
    it('should be a CompositeLogger instance', () => {
      expect(compositeLogger).toBeInstanceOf(CompositeLogger);
      expect(typeof compositeLogger.info).toBe('function');
      expect(typeof compositeLogger.error).toBe('function');
      expect(typeof compositeLogger.addLogger).toBe('function');
    });

    it('should handle empty logger list', () => {
      const emptyComposite = new CompositeLogger([]);

      // Should not throw
      expect(() => {
        emptyComposite.info('test');
        emptyComposite.error('error');
      }).not.toThrow();
    });
  });

  describe('info', () => {
    it('should delegate info calls to all loggers', () => {
      console.log('Testing CompositeLogger info delegation');
      const metadata: ILogMetadata = { title: 'Composite Test' };
      compositeLogger.info('test message', metadata);

      expect(mockLogger1.calls).toHaveLength(1);
      expect(mockLogger2.calls).toHaveLength(1);
      expect(mockLogger1.calls[0]).toMatchObject({
        level: LogLevel.INFO,
        message: 'test message',
        metadata,
      });
      expect(mockLogger2.calls[0]).toMatchObject({
        level: LogLevel.INFO,
        message: 'test message',
        metadata,
      });
    });
  });

  describe('error', () => {
    it('should delegate error calls to all loggers', () => {
      compositeLogger.error('error message');

      expect(mockLogger1.calls).toHaveLength(1);
      expect(mockLogger2.calls).toHaveLength(1);
      expect(mockLogger1.calls[0].level).toBe(LogLevel.ERROR);
      expect(mockLogger2.calls[0].level).toBe(LogLevel.ERROR);
    });
  });

  describe('group', () => {
    it('should handle group operations', async () => {
      const result = await compositeLogger.group('test group', async () => {
        compositeLogger.info('inside group');
        return 'success';
      });

      expect(result).toBe('success');
      // Check that group operations were recorded
      expect(mockLogger1.calls.some((call) => call.level === LogLevel.GROUP)).toBe(true);
      expect(mockLogger2.calls.some((call) => call.level === LogLevel.GROUP)).toBe(true);
    });

    it('should handle group operation with logger failures', async () => {
      const failingLogger: jest.Mocked<ILogger> = {
        info: jest.fn(),
        debug: jest.fn(),
        warning: jest.fn(),
        error: jest.fn(),
        setFailed: jest.fn(),
        group: jest.fn().mockImplementation(() => {
          throw new Error('Group failed');
        }) as jest.MockedFunction<ILogger[LogLevel.GROUP]>,
      };

      const compositeWithFailing = new CompositeLogger([failingLogger, mockLogger1]);

      const result = await compositeWithFailing.group('test group', async () => 'result');
      expect(result).toBe('result'); // Should succeed with the working logger
    });
  });

  describe('addLogger', () => {
    it('should allow adding and removing loggers', () => {
      const mockLogger3 = new MockLogger();

      compositeLogger.addLogger(mockLogger3);
      compositeLogger.info('message after adding');

      expect(mockLogger1.calls).toHaveLength(1);
      expect(mockLogger2.calls).toHaveLength(1);
      expect(mockLogger3.calls).toHaveLength(1);

      compositeLogger.removeLogger(mockLogger2);
      compositeLogger.info('message after removing');

      expect(mockLogger1.calls).toHaveLength(2);
      expect(mockLogger2.calls).toHaveLength(1); // No new calls
      expect(mockLogger3.calls).toHaveLength(2);
    });
  });

  describe('debug', () => {
    it('should delegate debug calls to all loggers', () => {
      compositeLogger.debug('debug message');

      expect(mockLogger1.calls).toHaveLength(1);
      expect(mockLogger2.calls).toHaveLength(1);
      expect(mockLogger1.calls[0].level).toBe(LogLevel.DEBUG);
      expect(mockLogger2.calls[0].level).toBe(LogLevel.DEBUG);
    });
  });

  describe('warning', () => {
    it('should delegate warning calls to all loggers', () => {
      const metadata = { component: 'test' };
      compositeLogger.warning('warning message', metadata);

      expect(mockLogger1.calls).toHaveLength(1);
      expect(mockLogger2.calls).toHaveLength(1);
      expect(mockLogger1.calls[0].level).toBe(LogLevel.WARNING);
      expect(mockLogger2.calls[0].level).toBe(LogLevel.WARNING);
    });
  });

  describe('setFailed', () => {
    it('should delegate setFailed calls to all loggers', () => {
      compositeLogger.setFailed('action failed');

      expect(mockLogger1.calls).toHaveLength(1);
      expect(mockLogger2.calls).toHaveLength(1);
      expect(mockLogger1.calls[0].level).toBe(LogLevel.FAILED);
      expect(mockLogger2.calls[0].level).toBe(LogLevel.FAILED);
    });
  });
});
