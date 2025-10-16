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

import { LogLevel, MockLogger } from '../../logging/index.js';

describe('MockLogger', () => {
  let mockLogger: MockLogger;

  afterEach(() => {
    jest.clearAllMocks();
  });

  beforeEach(() => {
    mockLogger = new MockLogger();
  });

  describe('info', () => {
    it('should record info calls', () => {
      mockLogger.info('test info message');
      expect(mockLogger.calls).toHaveLength(1);
      expect(mockLogger.calls[0]).toMatchObject({
        level: LogLevel.INFO,
        message: 'test info message',
      });
    });
  });

  describe('debug', () => {
    it('should record debug calls', () => {
      mockLogger.debug('test debug message');
      expect(mockLogger.calls).toHaveLength(1);
      expect(mockLogger.calls[0]).toMatchObject({
        level: LogLevel.DEBUG,
        message: 'test debug message',
      });
    });
  });

  describe('warning', () => {
    it('should record warning calls with metadata', () => {
      const metadata = { title: 'Warning' };
      mockLogger.warning('test warning', metadata);
      expect(mockLogger.calls).toHaveLength(1);
      expect(mockLogger.calls[0]).toMatchObject({
        level: LogLevel.WARNING,
        message: 'test warning',
        metadata,
      });
    });
  });

  describe('error', () => {
    it('should record error calls', () => {
      mockLogger.error('test error');
      expect(mockLogger.calls).toHaveLength(1);
      expect(mockLogger.calls[0]).toMatchObject({
        level: LogLevel.ERROR,
        message: 'test error',
      });
    });
  });

  describe('setFailed', () => {
    it('should record setFailed calls', () => {
      mockLogger.setFailed('test failure');
      expect(mockLogger.calls).toHaveLength(1);
      expect(mockLogger.calls[0]).toMatchObject({
        level: LogLevel.FAILED,
        message: 'test failure',
      });
    });
  });

  describe('group', () => {
    it('should handle group operations successfully', async () => {
      const mockFn = jest.fn<Promise<string>, []>().mockResolvedValue('success');
      const result = await mockLogger.group('test group', mockFn);

      expect(result).toBe('success');
      expect(mockLogger.calls).toHaveLength(2);
      expect(mockLogger.calls[0].message).toBe('START: test group');
      expect(mockLogger.calls[1].message).toBe('END: test group');
    });

    it('should handle group operations with errors', async () => {
      const mockFn = jest.fn<Promise<string>, []>().mockRejectedValue(new Error('test error'));

      await expect(mockLogger.group('test group', mockFn)).rejects.toThrow('test error');

      expect(mockLogger.calls).toHaveLength(2);
      expect(mockLogger.calls[0].message).toBe('START: test group');
      expect(mockLogger.calls[1].message).toBe('ERROR: test group');
    });
  });

  describe('getCallsForLevel', () => {
    it('should get calls for specific level', () => {
      mockLogger.info('info1');
      mockLogger.debug('debug1');
      mockLogger.info('info2');

      const infoCalls = mockLogger.getCallsForLevel(LogLevel.INFO);
      expect(infoCalls).toHaveLength(2);
      expect(infoCalls[0].message).toBe('info1');
      expect(infoCalls[1].message).toBe('info2');
    });
  });

  describe('getLastCall', () => {
    it('should get last call', () => {
      mockLogger.info('first');
      mockLogger.debug('last');

      const lastCall = mockLogger.getLastCall();
      expect(lastCall?.message).toBe('last');
      expect(lastCall?.level).toBe(LogLevel.DEBUG);
    });
  });

  describe('clear', () => {
    it('should clear calls', () => {
      mockLogger.info('test');
      expect(mockLogger.calls).toHaveLength(1);

      mockLogger.clear();
      expect(mockLogger.calls).toHaveLength(0);
    });
  });

  describe('assertCalled', () => {
    it('should assert called with string message', () => {
      mockLogger.info('expected message');
      expect(() => mockLogger.assertCalled(LogLevel.INFO, 'expected')).not.toThrow();
    });

    it('should assert called with regex message', () => {
      mockLogger.info('expected message');
      expect(() => mockLogger.assertCalled(LogLevel.INFO, /expected/)).not.toThrow();
    });

    it('should throw when asserting called but not called', () => {
      expect(() => mockLogger.assertCalled(LogLevel.INFO)).toThrow('Expected info to be called');
    });

    it('should throw when asserting called with message but wrong message', () => {
      mockLogger.info('wrong message');
      expect(() => mockLogger.assertCalled(LogLevel.INFO, 'expected')).toThrow(
        'Expected info to be called with message matching "expected"',
      );
    });
  });

  describe('assertNotCalled', () => {
    it('should assert not called', () => {
      expect(() => mockLogger.assertNotCalled(LogLevel.INFO)).not.toThrow();
    });

    it('should throw when asserting not called but was called', () => {
      mockLogger.info('test');
      expect(() => mockLogger.assertNotCalled(LogLevel.INFO)).toThrow(
        'Expected info not to be called',
      );
    });
  });
});
