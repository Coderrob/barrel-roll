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

import { ILogCall, ILogger, ILogMetadata, LogLevel } from '../types.js';

/**
 * Mock logger implementation for testing purposes.
 * Captures all log calls for verification in tests.
 */
export class MockLogger implements ILogger {
  public calls: ILogCall[] = [];

  /**
   * Records an informational log call for testing.
   * @param message - The message to log.
   * @param metadata - Optional metadata to include with the log.
   */
  info(message: string, metadata?: ILogMetadata): void {
    this.calls.push({
      level: LogLevel.INFO,
      message,
      metadata,
      timestamp: new Date(),
    });
  }

  /**
   * Records a debug log call for testing.
   * @param message - The message to log.
   */
  debug(message: string): void {
    this.calls.push({ level: LogLevel.DEBUG, message, timestamp: new Date() });
  }

  /**
   * Records a warning log call for testing.
   * @param message - The message to log.
   * @param metadata - Optional metadata to include with the log.
   */
  warn(message: string, metadata?: ILogMetadata): void {
    this.calls.push({
      level: LogLevel.WARNING,
      message,
      metadata,
      timestamp: new Date(),
    });
  }

  /**
   * @deprecated Use {@link warn} instead.
   */
  warning(message: string, metadata?: ILogMetadata): void {
    this.warn(message, metadata);
  }

  /**
   * Records an error log call for testing.
   * @param message - The message to log.
   * @param metadata - Optional metadata to include with the log.
   */
  error(message: string, metadata?: ILogMetadata): void {
    this.calls.push({
      level: LogLevel.ERROR,
      message,
      metadata,
      timestamp: new Date(),
    });
  }

  /**
   * Records a failed log call for testing.
   * @param message - The message to log.
   * @param metadata - Optional metadata to include with the log.
   */
  setFailed(message: string, metadata?: ILogMetadata): void {
    this.calls.push({
      level: LogLevel.FAILED,
      message,
      metadata,
      timestamp: new Date(),
    });
  }

  /**
   * Groups multiple log calls together.
   * @param name - The name of the group.
   * @param fn - The function containing the log calls to group.
   */
  async group<T>(name: string, fn: () => Promise<T>): Promise<T> {
    const startCall: ILogCall = {
      level: LogLevel.GROUP,
      message: `START: ${name}`,
      timestamp: new Date(),
    };
    this.calls.push(startCall);

    try {
      const result = await fn();
      this.calls.push({
        level: LogLevel.GROUP,
        message: `END: ${name}`,
        timestamp: new Date(),
      });
      return result;
    } catch (error) {
      this.calls.push({
        level: LogLevel.GROUP,
        message: `ERROR: ${name}`,
        metadata: { error },
        timestamp: new Date(),
      });
      throw error;
    }
  }

  /**
   * Get all calls for a specific log level.
   * @param level - The log level to filter by.
   * @returns Array of log calls for the specified level.
   */
  getCallsForLevel(level: LogLevel): ILogCall[] {
    return this.calls.filter((call) => call.level === level);
  }

  /**
   * Get the last call made to the logger.
   * @returns The last log call or undefined if no calls were made.
   */
  getLastCall(): ILogCall | undefined {
    return this.calls[this.calls.length - 1];
  }

  /**
   * Clear all recorded calls.
   */
  clear(): void {
    this.calls = [];
  }

  /**
   * Assert that a specific call was made.
   * @param level - The expected log level.
   * @param message - Optional message or regex pattern to match.
   * @throws Error if the assertion fails.
   */
  assertCalled(level: LogLevel, message?: string | RegExp): void {
    const calls = this.getCallsForLevel(level);
    if (calls.length === 0) {
      throw new Error(`Expected ${level} to be called, but it wasn't`);
    }

    if (message !== undefined) {
      const matchingCalls =
        typeof message === 'string'
          ? calls.filter((call) => call.message.includes(message))
          : calls.filter((call) => message.test(call.message));

      if (matchingCalls.length === 0) {
        throw new Error(
          `Expected ${level} to be called with message matching "${message}", but it wasn't`,
        );
      }
    }
  }

  /**
   * Assert that no calls were made to a specific level.
   * @param level - The log level to check.
   * @throws Error if the assertion fails.
   */
  assertNotCalled(level: LogLevel): void {
    const calls = this.getCallsForLevel(level);
    if (calls.length > 0) {
      throw new Error(
        `Expected ${level} not to be called, but it was called ${calls.length} times`,
      );
    }
  }
}
