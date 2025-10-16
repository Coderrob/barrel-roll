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

import pino from 'pino';

import { NoopLogger } from '../loggers/noop.js';
import { ILogger, ILogMetadata } from '../types.js';

/**
 * Implementation of ILogger that uses Pino for structured logging.
 */
export class PinoLogger implements ILogger {
  private logger: pino.Logger;
  private isAvailable: boolean = true;

  constructor(options?: pino.LoggerOptions) {
    try {
      this.logger = pino(
        options || {
          level: process.env.LOG_LEVEL || 'info',
          transport: {
            target: 'pino-pretty',
            options: {
              colorize: true,
              translateTime: 'yyyy-mm-dd HH:MM:ss',
              ignore: 'pid,hostname',
            },
          },
        },
      );
    } catch (error) {
      this.isAvailable = false;
      console.warn('Pino logger initialization failed:', error);
      // Create a fallback null logger
      this.logger = new NoopLogger() as unknown as pino.Logger;
    }
  }

  /**
   * Check if Pino logger is available and functioning.
   * @returns True if the logger is available, false otherwise.
   */
  public isLoggerAvailable(): boolean {
    return this.isAvailable;
  }

  /**
   * Logs an informational message using Pino.
   * @param message - The message to log.
   * @param metadata - Optional metadata to include with the log.
   */
  info(message: string, metadata?: ILogMetadata): void {
    this.logger.info(metadata || {}, message);
  }

  /**
   * Logs a debug message using Pino.
   * @param message - The message to log.
   */
  debug(message: string): void {
    this.logger.debug({}, message);
  }

  /**
   * Logs a warning message using Pino.
   * @param message - The message to log.
   * @param metadata - Optional metadata to include with the log.
   */
  warning(message: string, metadata?: ILogMetadata): void {
    this.logger.warn(metadata || {}, message);
  }

  /**
   * Logs an error message using Pino.
   * @param message - The message to log.
   * @param metadata - Optional metadata to include with the log.
   */
  error(message: string, metadata?: ILogMetadata): void {
    this.logger.error(metadata || {}, message);
  }

  /**
   * Logs a fatal error message using Pino (used for action failures).
   * @param message - The failure message.
   * @param metadata - Optional metadata to include with the failure.
   */
  setFailed(message: string, metadata?: ILogMetadata): void {
    this.logger.fatal(metadata || {}, `Action failed: ${message}`);
  }

  /**
   * Executes a grouped operation with Pino child logger context.
   * @param name - The name of the group.
   * @param fn - The function to execute within the group.
   * @returns A promise that resolves when the group operation completes.
   */
  async group<T>(name: string, fn: () => Promise<T>): Promise<T> {
    // Create a child logger for the group context
    const childLogger = this.logger.child({ group: name });
    const originalLogger = this.logger;

    // Temporarily replace the logger with the child logger
    this.logger = childLogger;
    childLogger.info(`Starting group: ${name}`);

    try {
      const result = await fn();
      childLogger.info(`Completed group: ${name}`);
      return result;
    } catch (error) {
      childLogger.error({ error }, `Failed in group: ${name}`);
      throw error;
    } finally {
      // Restore the original logger
      this.logger = originalLogger;
    }
  }
}
