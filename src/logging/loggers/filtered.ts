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

import { ILogger, ILogMetadata, ISamplingStrategy, LogFilter, LogLevel } from '../types.js';

/**
 * Logger wrapper that applies filtering and sampling
 */
export class FilteredLogger implements ILogger {
  private logCounts = new Map<string, { count: number; windowStart: number }>();

  constructor(
    private wrappedLogger: ILogger,
    private filters: LogFilter[] = [],
    private sampling?: ISamplingStrategy,
  ) {}

  /**
   * Logs an informational message if it passes all filters.
   * @param message - The message to log.
   * @param metadata - Optional metadata to include with the log.
   */
  info(message: string, metadata?: ILogMetadata): void {
    this.logIfAllowed(LogLevel.INFO, message, metadata, () =>
      metadata ? this.wrappedLogger.info(message, metadata) : this.wrappedLogger.info(message),
    );
  }

  /**
   * Logs a debug message if it passes all filters.
   * @param message - The message to log.
   */
  debug(message: string): void {
    this.logIfAllowed(LogLevel.DEBUG, message, undefined, () => this.wrappedLogger.debug(message));
  }

  /**
   * Logs a warning message if it passes all filters.
   * @param message - The message to log.
   * @param metadata - Optional metadata to include with the log.
   */
  warning(message: string, metadata?: ILogMetadata): void {
    this.logIfAllowed(LogLevel.WARNING, message, metadata, () =>
      metadata
        ? this.wrappedLogger.warning(message, metadata)
        : this.wrappedLogger.warning(message),
    );
  }

  /**
   * Logs an error message if it passes all filters.
   * @param message - The message to log.
   * @param metadata - Optional metadata to include with the log.
   */
  error(message: string, metadata?: ILogMetadata): void {
    this.logIfAllowed(LogLevel.ERROR, message, metadata, () =>
      metadata ? this.wrappedLogger.error(message, metadata) : this.wrappedLogger.error(message),
    );
  }

  /**
   * Logs a failure message (always logged, regardless of filters).
   * @param message - The failure message.
   * @param metadata - Optional metadata to include with the failure.
   */
  setFailed(message: string, metadata?: ILogMetadata): void {
    // Always log failures regardless of filtering
    this.wrappedLogger.setFailed(message, metadata);
  }

  /**
   * Executes a grouped operation (not filtered).
   * @param name - The name of the group.
   * @param fn - The function to execute within the group.
   * @returns A promise that resolves when the group operation completes.
   */
  async group<T>(name: string, fn: () => Promise<T>): Promise<T> {
    return this.wrappedLogger.group(name, fn);
  }

  /**
   * Add a new filter
   * @param filter - The filter function to add
   */
  addFilter(filter: LogFilter): void {
    this.filters.push(filter);
  }

  /**
   * Remove all filters
   */
  clearFilters(): void {
    this.filters = [];
  }

  /**
   * Update sampling strategy
   * @param strategy - The new sampling strategy
   */
  setSampling(strategy: ISamplingStrategy | undefined): void {
    this.sampling = strategy;
  }

  /**
   * Determines if a log entry should be logged based on filters and sampling.
   * @param level - The log level.
   * @param message - The log message.
   * @param metadata - Optional metadata associated with the log.
   * @returns True if the log should be recorded, false otherwise.
   */
  private shouldLog(level: LogLevel, message: string, metadata?: ILogMetadata): boolean {
    // Apply filters - return false immediately if any filter fails
    for (const filter of this.filters) {
      if (!filter(level, message, metadata)) {
        return false;
      }
    }

    // No sampling configured = allow all logs
    if (!this.sampling) {
      return true;
    }

    return this.sampling.shouldSample
      ? this.sampling.shouldSample(level, message, metadata)
      : this.shouldSample(level);
  }

  /**
   * Determines if a log entry should be sampled based on rate and window constraints.
   * @param level - The log level.
   * @returns True if the log should be recorded, false otherwise.
   */
  private shouldSample(level: LogLevel): boolean {
    if (!this.passesRateSampling()) {
      return false;
    }

    const logCount = this.getOrCreateLogCount(level, Date.now(), this.sampling?.windowMs || 60000);

    if (!this.passesWindowSampling(logCount)) {
      return false;
    }

    logCount.count++;
    return true;
  }

  /**
   * Determines if a log entry passes rate-based sampling.
   * @returns True if the log passes rate sampling, false otherwise.
   */
  private passesRateSampling(): boolean {
    if (!this.sampling?.rate) {
      return true;
    }
    // eslint-disable-next-line sonarjs/pseudo-random
    return Math.random() <= this.sampling.rate;
  }

  /**
   * Determines if a log entry passes window-based sampling constraints.
   * @param logCount - The current log count and window start time.
   * @returns True if the log passes window sampling, false otherwise.
   */
  private passesWindowSampling(logCount: { count: number; windowStart: number }): boolean {
    return !(this.sampling?.maxPerWindow && logCount.count >= this.sampling.maxPerWindow);
  }

  /**
   * Logs a message if it passes filtering and sampling checks.
   * @param level - The log level.
   * @param message - The log message.
   * @param metadata - Optional metadata associated with the log.
   * @param logAction - The action to perform if the log is allowed.
   */
  private logIfAllowed(
    level: LogLevel,
    message: string,
    metadata: ILogMetadata | undefined,
    logAction: () => void,
  ): void {
    if (this.shouldLog(level, message, metadata)) {
      logAction();
    }
  }

  /**
   * Retrieves or initializes the log count for a given key and time window.
   * @param key - The key representing the log level or category.
   * @param now - The current timestamp.
   * @param windowMs - The duration of the time window in milliseconds.
   * @returns The log count object containing the count and window start time.
   */
  private getOrCreateLogCount(
    key: string,
    now: number,
    windowMs: number,
  ): { count: number; windowStart: number } {
    let logCount = this.logCounts.get(key);
    if (!logCount || now - logCount.windowStart > windowMs) {
      logCount = { count: 0, windowStart: now };
      this.logCounts.set(key, logCount);
    }
    return logCount;
  }
}
