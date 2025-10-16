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

import { ILogger, ILogMetadata } from '../types.js';

/**
 * CompositeLogger that delegates logging calls to multiple logger providers.
 * This allows for logging to multiple destinations simultaneously (e.g., console and file).
 */
export class CompositeLogger implements ILogger {
  private loggers: ILogger[];

  constructor(loggers: ILogger[]) {
    this.loggers = loggers;
  }

  /**
   * Logs an informational message to all registered loggers.
   * @param message - The message to log.
   * @param metadata - Optional metadata to include with the log.
   */
  info(message: string, metadata?: ILogMetadata): void {
    this.loggers.forEach((logger) => logger.info(message, metadata));
  }

  /**
   * Logs a debug message to all registered loggers.
   * @param message - The message to log.
   */
  debug(message: string): void {
    this.loggers.forEach((logger) => logger.debug(message));
  }

  /**
   * Logs a warning message to all registered loggers.
   * @param message - The message to log.
   * @param metadata - Optional metadata to include with the log.
   */
  warning(message: string, metadata?: ILogMetadata): void {
    this.loggers.forEach((logger) => logger.warning(message, metadata));
  }

  /**
   * Logs an error message to all registered loggers.
   * @param message - The message to log.
   * @param metadata - Optional metadata to include with the log.
   */
  error(message: string, metadata?: ILogMetadata): void {
    this.loggers.forEach((logger) => logger.error(message, metadata));
  }

  /**
   * Sets the action as failed in all registered loggers.
   * @param message - The failure message.
   * @param metadata - Optional metadata to include with the failure.
   */
  setFailed(message: string, metadata?: ILogMetadata): void {
    this.loggers.forEach((logger) => logger.setFailed(message, metadata));
  }

  /**
   * Executes a grouped operation with all registered loggers.
   * Each logger's group wraps the function execution individually.
   * @param name - The name of the group.
   * @param fn - The function to execute within the group.
   * @returns A promise that resolves when all group operations complete.
   */
  async group<T>(name: string, fn: () => Promise<T>): Promise<T> {
    if (this.loggers.length === 0) {
      return fn();
    }

    if (this.loggers.length === 1) {
      return this.loggers[0].group(name, fn);
    }

    return this.executeGroupWithMultipleLoggers(name, fn);
  }

  /**
   * Execute group operation when there are multiple loggers.
   * @param name - The name of the group.
   * @param fn - The function to execute within the group.
   * @returns A promise that resolves when all group operations complete.
   */
  private async executeGroupWithMultipleLoggers<T>(name: string, fn: () => Promise<T>): Promise<T> {
    const results = await Promise.allSettled(
      this.loggers.map((logger, index) => this.executeLoggerGroup(logger, index, name, fn)),
    );

    return this.processGroupResults(results);
  }

  /**
   * Execute group operation for a single logger with error handling.
   * @param logger - The logger to execute the group on.
   * @param index - The index of the logger in the composite.
   * @param name - The name of the group.
   * @param fn - The function to execute within the group.
   * @returns A promise that resolves with the result of the group operation.
   */
  private async executeLoggerGroup<T>(
    logger: ILogger,
    index: number,
    name: string,
    fn: () => Promise<T>,
  ): Promise<T> {
    try {
      return await logger.group(name, fn);
    } catch (error) {
      throw new Error(`Logger ${index} failed in group operation: ${error}`);
    }
  }

  /**
   * Process the results of multiple logger group operations.
   * @param results - Array of PromiseSettledResult from each logger's group operation.
   * @returns The result from the first successful logger, or throws if all failed.
   */
  private processGroupResults<T>(results: PromiseSettledResult<T>[]): T {
    const { failures, successResult } = this.analyzeResults(results);

    if (failures.length === results.length) {
      this.logAllFailures(failures);
      throw failures[0].error;
    }

    if (failures.length > 0) {
      this.logPartialFailures(failures, results.length);
    }

    return successResult as T;
  }

  /**
   * Analyze the results to separate failures and find success result.
   * @return An object containing failures and the first successful result (if any).
   */
  private analyzeResults<T>(results: PromiseSettledResult<T>[]) {
    const failures: Array<{ index: number; error: unknown }> = [];
    let successResult: T | undefined;

    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        if (successResult === undefined) {
          successResult = result.value;
        }
      } else {
        failures.push({ index, error: result.reason });
      }
    });

    return { failures, successResult };
  }

  /**
   * Log when all loggers failed.
   * @param failures - Array of failure details
   */
  private logAllFailures(failures: Array<{ index: number; error: unknown }>) {
    console.error('All loggers failed in group operation:', failures);
  }

  /**
   * Log when some loggers failed but others succeeded.
   * @param failures - Array of failure details
   * @param totalCount - Total number of loggers involved
   */
  private logPartialFailures(
    failures: Array<{ index: number; error: unknown }>,
    totalCount: number,
  ) {
    console.warn(
      `${failures.length} of ${totalCount} loggers failed in group operation:`,
      failures,
    );
  }

  /**
   * Add a new logger to the composite.
   * @param logger - The logger to add
   */
  addLogger(logger: ILogger): void {
    this.loggers.push(logger);
  }

  /**
   * Remove a logger from the composite.
   * @param logger - The logger to remove
   */
  removeLogger(logger: ILogger): void {
    const index = this.loggers.indexOf(logger);
    if (index > -1) {
      this.loggers.splice(index, 1);
    }
  }
}
