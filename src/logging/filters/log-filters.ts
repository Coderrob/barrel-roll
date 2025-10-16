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

import { ILogMetadata, LogFilter, LogLevel } from '../types.js';

/**
 * Common log filters
 */
export class LogFilters {
  private static readonly LEVEL_VALUES: Record<LogLevel, number> = {
    [LogLevel.GROUP]: -1,
    [LogLevel.DEBUG]: 0,
    [LogLevel.INFO]: 1,
    [LogLevel.WARNING]: 2,
    [LogLevel.ERROR]: 3,
    [LogLevel.FAILED]: 4,
  };

  /**
   * Filter out logs below a certain level
   * @param minLevel - The minimum log level to allow.
   * @return A LogFilter function that filters out logs below the specified level.
   */
  static levelFilter(minLevel: LogLevel): LogFilter {
    const minLevelValue = this.LEVEL_VALUES[minLevel];

    return (level: string) => {
      const levelValue = this.LEVEL_VALUES[level as keyof typeof this.LEVEL_VALUES] ?? 1;
      return levelValue >= minLevelValue;
    };
  }

  /**
   * Exclude logs that match a pattern
   * @param pattern - The string or RegExp pattern to match against log messages.
   * @return A LogFilter function that excludes messages matching the pattern.
   */
  static excludePattern(pattern: string | RegExp): LogFilter {
    const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;
    return (_, message) => !regex.test(message);
  }

  /**
   * Only include logs that match a pattern
   * @param pattern - The string or RegExp pattern to match against log messages.
   * @return A LogFilter function that includes only messages matching the pattern.
   */
  static includePattern(pattern: string | RegExp): LogFilter {
    const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;
    return (_, message) => regex.test(message);
  }

  /**
   * Filter based on metadata properties
   * @param predicate - A function that takes metadata and returns true to include the log, false to exclude it.
   * @return A LogFilter function that filters logs based on the provided predicate.
   */
  static metadataFilter(predicate: (metadata?: ILogMetadata) => boolean): LogFilter {
    return (_, __, metadata) => predicate(metadata);
  }

  /**
   * Rate limiting filter (simple implementation)
   * @param maxPerSecond - Maximum number of logs allowed per second.
   * @return A LogFilter function that limits the rate of logs.
   */
  static rateLimit(maxPerSecond: number): LogFilter {
    let lastReset = Date.now();
    let count = 0;

    return () => {
      const now = Date.now();
      if (now - lastReset >= 1000) {
        lastReset = now;
        count = 0;
      }

      if (count >= maxPerSecond) {
        return false;
      }

      count++;
      return true;
    };
  }
}
