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
  warn(message: string, metadata?: ILogMetadata): void {
    this.loggers.forEach((logger) => logger.warn(message, metadata));
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

    const executeOnce = this.createSingleExecution(name, fn);
    let lastError: unknown;

    for (let index = 0; index < this.loggers.length; index++) {
      const logger = this.loggers[index];

      try {
        return await logger.group(name, () => executeOnce(index));
      } catch (error) {
        lastError = error;
        this.logGroupFailure(index, error);
      }
    }

    throw this.normalizeGroupError(name, lastError);
  }

  private createSingleExecution<T>(name: string, fn: () => Promise<T>) {
    let execution: Promise<T> | undefined;

    return async (executingIndex: number): Promise<T> => {
      if (!execution) {
        const otherLoggers = this.loggers.filter((_, index) => index !== executingIndex);
        execution = (async () => {
          this.emitGroupStart(otherLoggers, name);
          try {
            const result = await fn();
            this.emitGroupCompletion(otherLoggers, name);
            return result;
          } catch (error) {
            this.emitGroupFailure(otherLoggers, name, error);
            throw error;
          }
        })();
      }

      return execution;
    };
  }

  private emitGroupStart(loggers: ILogger[], name: string): void {
    loggers.forEach((logger) => logger.info(`Starting group: ${name}`));
  }

  private emitGroupCompletion(loggers: ILogger[], name: string): void {
    loggers.forEach((logger) => logger.info(`Completed group: ${name}`));
  }

  private emitGroupFailure(loggers: ILogger[], name: string, error: unknown): void {
    loggers.forEach((logger) => logger.error(`Failed in group: ${name}`, { error }));
  }

  private logGroupFailure(index: number, error: unknown): void {
    console.warn(`Logger ${index} failed in group operation:`, error);
  }

  private normalizeGroupError(name: string, error: unknown): Error {
    if (error instanceof Error) {
      return error;
    }

    return new Error(`Group '${name}' failed with unknown error.`);
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
