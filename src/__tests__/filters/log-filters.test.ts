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

import { LogFilters, LogLevel } from '../../logging/index.js';

describe('LogFilters', () => {
  describe('levelFilter', () => {
    it('should allow logs at or above the minimum level', () => {
      const filter = LogFilters.levelFilter(LogLevel.WARNING);

      expect(filter(LogLevel.ERROR, 'test message')).toBe(true);
      expect(filter(LogLevel.WARNING, 'test message')).toBe(true);
      expect(filter(LogLevel.INFO, 'test message')).toBe(false);
      expect(filter(LogLevel.DEBUG, 'test message')).toBe(false);
    });

    it('should handle unknown log levels as INFO level', () => {
      const filter = LogFilters.levelFilter(LogLevel.WARNING);

      expect(filter('unknown', 'test message')).toBe(false); // INFO level (1) < WARNING level (2)
    });

    it('should allow all logs when minimum level is DEBUG', () => {
      const filter = LogFilters.levelFilter(LogLevel.DEBUG);

      expect(filter(LogLevel.DEBUG, 'test message')).toBe(true);
      expect(filter(LogLevel.INFO, 'test message')).toBe(true);
      expect(filter(LogLevel.WARNING, 'test message')).toBe(true);
      expect(filter(LogLevel.ERROR, 'test message')).toBe(true);
    });
  });

  describe('excludePattern', () => {
    it('should exclude messages matching string pattern', () => {
      const filter = LogFilters.excludePattern('error');

      expect(filter(LogLevel.ERROR, 'This is an error message')).toBe(false);
      expect(filter(LogLevel.INFO, 'This is a normal message')).toBe(true);
    });

    it('should exclude messages matching RegExp pattern', () => {
      const filter = LogFilters.excludePattern(/error/i);

      expect(filter(LogLevel.ERROR, 'This is an ERROR message')).toBe(false);
      expect(filter(LogLevel.INFO, 'This is a normal message')).toBe(true);
    });

    it('should handle messages without pattern match', () => {
      const filter = LogFilters.excludePattern('error');

      expect(filter(LogLevel.INFO, 'This is a success message')).toBe(true);
    });
  });

  describe('includePattern', () => {
    it('should include only messages matching string pattern', () => {
      const filter = LogFilters.includePattern('important');

      expect(filter(LogLevel.INFO, 'This is an important message')).toBe(true);
      expect(filter(LogLevel.ERROR, 'This is a normal error')).toBe(false);
    });

    it('should include only messages matching RegExp pattern', () => {
      const filter = LogFilters.includePattern(/important/i);

      expect(filter(LogLevel.INFO, 'This is an IMPORTANT message')).toBe(true);
      expect(filter(LogLevel.ERROR, 'This is a normal error')).toBe(false);
    });
  });

  describe('metadataFilter', () => {
    it('should filter based on metadata predicate', () => {
      const filter = LogFilters.metadataFilter((metadata) => metadata?.priority === 'high');

      expect(filter(LogLevel.INFO, 'message', { priority: 'high' })).toBe(true);
      expect(filter(LogLevel.ERROR, 'message', { priority: 'low' })).toBe(false);
      expect(filter(LogLevel.WARNING, 'message')).toBe(false);
    });

    it('should handle undefined metadata', () => {
      const filter = LogFilters.metadataFilter((metadata) => !metadata);

      expect(filter(LogLevel.INFO, 'message')).toBe(true);
      expect(filter(LogLevel.ERROR, 'message', { some: 'data' })).toBe(false);
    });
  });

  describe('rateLimit', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should allow logs within rate limit', () => {
      const filter = LogFilters.rateLimit(2);

      expect(filter(LogLevel.INFO, 'message')).toBe(true);
      expect(filter(LogLevel.INFO, 'message')).toBe(true);
      expect(filter(LogLevel.INFO, 'message')).toBe(false);
    });

    it('should reset count after one second', () => {
      const filter = LogFilters.rateLimit(1);

      expect(filter(LogLevel.INFO, 'message')).toBe(true);
      expect(filter(LogLevel.INFO, 'message')).toBe(false);

      // Advance time by 1 second
      jest.advanceTimersByTime(1000);

      expect(filter(LogLevel.INFO, 'message')).toBe(true);
    });

    it('should allow unlimited logs when rate is high', () => {
      const filter = LogFilters.rateLimit(100);

      for (let i = 0; i < 10; i++) {
        expect(filter(LogLevel.INFO, 'message')).toBe(true);
      }
    });

    it('should handle zero rate limit', () => {
      const filter = LogFilters.rateLimit(0);

      expect(filter(LogLevel.INFO, 'message')).toBe(false);
    });
  });
});
