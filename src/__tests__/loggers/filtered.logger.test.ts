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
 */

import { FilteredLogger, LogFilters, LogLevel, MockLogger } from '../../logging/index.js';

describe('FilteredLogger', () => {
  let mockLogger: MockLogger;
  let filteredLogger: FilteredLogger;

  afterEach(() => {
    jest.clearAllMocks();
  });

  beforeEach(() => {
    mockLogger = new MockLogger();
    filteredLogger = new FilteredLogger(mockLogger);
  });

  describe('constructor', () => {
    it('should create FilteredLogger with default filters', () => {
      expect(filteredLogger).toBeInstanceOf(FilteredLogger);
    });

    it('should create FilteredLogger with provided filters', () => {
      const filters = [LogFilters.levelFilter(LogLevel.WARNING)];
      const logger = new FilteredLogger(mockLogger, filters);

      expect(logger).toBeInstanceOf(FilteredLogger);
    });

    it('should create FilteredLogger with sampling strategy', () => {
      const sampling = { rate: 0.5 };
      const logger = new FilteredLogger(mockLogger, [], sampling);

      expect(logger).toBeInstanceOf(FilteredLogger);
    });
  });

  describe('info', () => {
    it('should log info messages when no filters', () => {
      filteredLogger.info('test message');

      expect(mockLogger.getLastCall()).toEqual({
        level: LogLevel.INFO,
        message: 'test message',
        timestamp: expect.any(Date),
      });
    });

    it('should log info messages with metadata when no filters', () => {
      const metadata = { userId: 123 };
      filteredLogger.info('test message', metadata);

      expect(mockLogger.getLastCall()).toEqual({
        level: LogLevel.INFO,
        message: 'test message',
        metadata,
        timestamp: expect.any(Date),
      });
    });

    it('should filter out info messages below level filter', () => {
      const logger = new FilteredLogger(mockLogger, [LogFilters.levelFilter(LogLevel.WARNING)]);

      logger.info('test message');

      expect(mockLogger.getCallsForLevel(LogLevel.INFO)).toHaveLength(0);
    });

    it('should filter out info messages matching exclude pattern', () => {
      const logger = new FilteredLogger(mockLogger, [LogFilters.excludePattern('secret')]);

      logger.info('This contains secret data');

      expect(mockLogger.getCallsForLevel(LogLevel.INFO)).toHaveLength(0);
    });
  });

  describe('debug', () => {
    it('should log debug messages when no filters', () => {
      filteredLogger.debug('debug message');

      expect(mockLogger.getLastCall()).toEqual({
        level: LogLevel.DEBUG,
        message: 'debug message',
        timestamp: expect.any(Date),
      });
    });

    it('should filter out debug messages below level filter', () => {
      const logger = new FilteredLogger(mockLogger, [LogFilters.levelFilter(LogLevel.INFO)]);

      logger.debug('debug message');

      expect(mockLogger.getCallsForLevel(LogLevel.DEBUG)).toHaveLength(0);
    });
  });

  describe('warning', () => {
    it('should log warning messages when no filters', () => {
      filteredLogger.warning('warning message');

      expect(mockLogger.getLastCall()).toEqual({
        level: LogLevel.WARNING,
        message: 'warning message',
        timestamp: expect.any(Date),
      });
    });

    it('should log warning messages with metadata when no filters', () => {
      const metadata = { component: 'test' };
      filteredLogger.warning('warning message', metadata);

      expect(mockLogger.getLastCall()).toEqual({
        level: LogLevel.WARNING,
        message: 'warning message',
        metadata,
        timestamp: expect.any(Date),
      });
    });
  });

  describe('error', () => {
    it('should log error messages when no filters', () => {
      filteredLogger.error('error message');

      expect(mockLogger.getLastCall()).toEqual({
        level: LogLevel.ERROR,
        message: 'error message',
        timestamp: expect.any(Date),
      });
    });

    it('should log error messages with metadata when no filters', () => {
      const metadata = { error: 'test error' };
      filteredLogger.error('error message', metadata);

      expect(mockLogger.getLastCall()).toEqual({
        level: LogLevel.ERROR,
        message: 'error message',
        metadata,
        timestamp: expect.any(Date),
      });
    });
  });

  describe('setFailed', () => {
    it('should always log failed messages regardless of filters', () => {
      const logger = new FilteredLogger(mockLogger, [LogFilters.levelFilter(LogLevel.ERROR)]);

      logger.setFailed('failure message');

      expect(mockLogger.getLastCall()).toEqual({
        level: LogLevel.FAILED,
        message: 'failure message',
        timestamp: expect.any(Date),
      });
    });

    it('should log failed messages with metadata', () => {
      const metadata = { severity: 'critical' };
      filteredLogger.setFailed('failure message', metadata);

      expect(mockLogger.getLastCall()).toEqual({
        level: LogLevel.FAILED,
        message: 'failure message',
        metadata,
        timestamp: expect.any(Date),
      });
    });
  });

  describe('group', () => {
    it('should delegate group operations to wrapped logger', async () => {
      const mockFn = jest.fn<Promise<string>, []>().mockResolvedValue('result');

      const result = await filteredLogger.group('test group', mockFn);

      expect(result).toBe('result');
      expect(mockFn).toHaveBeenCalled();
    });
  });

  describe('addFilter', () => {
    it('should add filters to the logger', () => {
      const filter = LogFilters.levelFilter(LogLevel.WARNING);

      filteredLogger.addFilter(filter);

      // Test that the filter is applied
      filteredLogger.info('info message');
      expect(mockLogger.getCallsForLevel(LogLevel.INFO)).toHaveLength(0);
    });
  });

  describe('clearFilters', () => {
    it('should remove all filters', () => {
      const filter = LogFilters.levelFilter(LogLevel.WARNING);
      filteredLogger.addFilter(filter);

      filteredLogger.clearFilters();

      // Test that filters are cleared
      filteredLogger.info('info message');
      expect(mockLogger.getCallsForLevel(LogLevel.INFO)).toHaveLength(1);
    });
  });

  describe('setSampling', () => {
    it('should update sampling strategy', () => {
      const sampling = { rate: 0.5 };
      filteredLogger.setSampling(sampling);

      // Test that sampling is applied (this is tested more thoroughly in sampling tests)
      expect(() => filteredLogger.setSampling(undefined)).not.toThrow();
    });
  });

  describe('sampling', () => {
    beforeEach(() => {
      jest.spyOn(Math, 'random').mockReturnValue(0.3); // 30% - below 50% rate
    });

    afterEach(() => {
      jest.spyOn(Math, 'random').mockRestore();
    });

    it('should apply rate-based sampling', () => {
      const logger = new FilteredLogger(mockLogger, [], { rate: 0.5 });

      logger.info('test message');

      // Should pass due to random <= rate (0.3 <= 0.5)
      expect(mockLogger.getCallsForLevel(LogLevel.INFO)).toHaveLength(1);
    });

    it('should allow logs when random value is below rate', () => {
      jest.spyOn(Math, 'random').mockReturnValue(0.4); // 40% - below 50% rate, should pass
      const logger = new FilteredLogger(mockLogger, [], { rate: 0.5 });

      logger.info('test message');

      expect(mockLogger.getCallsForLevel(LogLevel.INFO)).toHaveLength(1);
    });

    it('should allow logs when random value is above rate threshold', () => {
      jest.spyOn(Math, 'random').mockReturnValue(0.6); // 60% - above 50% rate, should fail
      const logger = new FilteredLogger(mockLogger, [], { rate: 0.5 });

      logger.info('test message');

      expect(mockLogger.getCallsForLevel(LogLevel.INFO)).toHaveLength(0);
    });
  });

  describe('window-based sampling', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should limit logs per window', () => {
      const logger = new FilteredLogger(mockLogger, [], {
        rate: 1.0, // Allow all logs through rate sampling
        maxPerWindow: 2,
        windowMs: 1000,
      });

      logger.info('message 1');
      logger.info('message 2');
      logger.info('message 3'); // Should be filtered

      expect(mockLogger.getCallsForLevel(LogLevel.INFO)).toHaveLength(2);
    });

    it('should reset window after time expires', () => {
      const originalDateNow = Date.now;
      const mockNow = jest.fn();
      mockNow.mockReturnValue(1000); // Initial time
      Date.now = mockNow as any;

      const logger = new FilteredLogger(mockLogger, [], {
        rate: 1.0, // Allow all logs through rate sampling
        maxPerWindow: 1,
        windowMs: 1000,
      });

      logger.info('message 1');
      expect(mockLogger.getCallsForLevel(LogLevel.INFO)).toHaveLength(1);

      mockNow.mockReturnValue(2001); // After window expires (1000 + 1000 + 1)

      logger.info('message 2'); // Should be allowed after window reset
      expect(mockLogger.getCallsForLevel(LogLevel.INFO)).toHaveLength(2);

      Date.now = originalDateNow;
    });
  });

  describe('custom sampling strategy', () => {
    it('should use custom shouldSample function', () => {
      const customSampling = {
        rate: 1.0, // Required by interface
        shouldSample: jest.fn().mockReturnValue(false) as any,
      };
      const logger = new FilteredLogger(mockLogger, [], customSampling);

      logger.info('test message');

      expect(customSampling.shouldSample).toHaveBeenCalledWith(
        LogLevel.INFO,
        'test message',
        undefined,
      );
      expect(mockLogger.getCallsForLevel(LogLevel.INFO)).toHaveLength(0);
    });

    it('should use custom shouldSample function with metadata', () => {
      const customSampling = {
        rate: 1.0, // Required by interface
        shouldSample: jest.fn().mockReturnValue(true) as any,
      };
      const logger = new FilteredLogger(mockLogger, [], customSampling);
      const metadata = { test: true };

      logger.warning('warning message', metadata);

      expect(customSampling.shouldSample).toHaveBeenCalledWith(
        LogLevel.WARNING,
        'warning message',
        metadata,
      );
      expect(mockLogger.getCallsForLevel(LogLevel.WARNING)).toHaveLength(1);
    });
  });

  describe('complex filtering scenarios', () => {
    it('should apply multiple filters (all must pass)', () => {
      const filters = [
        LogFilters.levelFilter(LogLevel.INFO),
        LogFilters.includePattern('important'),
      ];
      const logger = new FilteredLogger(mockLogger, filters);

      logger.info('This is an important message'); // Should pass
      logger.info('This is a normal message'); // Should fail pattern filter
      logger.debug('This is an important debug'); // Should fail level filter

      expect(mockLogger.getCallsForLevel(LogLevel.INFO)).toHaveLength(1);
    });

    it('should combine filtering and sampling', () => {
      jest.spyOn(Math, 'random').mockReturnValue(0.4); // Below rate threshold (0.4 <= 0.5)

      const filters = [LogFilters.levelFilter(LogLevel.WARNING)];
      const sampling = { rate: 0.5 };
      const logger = new FilteredLogger(mockLogger, filters, sampling);

      logger.warning('warning message'); // Should pass both filter and sampling

      expect(mockLogger.getCallsForLevel(LogLevel.WARNING)).toHaveLength(1);

      jest.spyOn(Math, 'random').mockRestore();
    });
  });
});
