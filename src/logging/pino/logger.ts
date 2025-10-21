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
import type { OutputChannel } from 'vscode';

type LogMetadata = Record<string, unknown>;

/**
 * Minimal structured logger used by the extension. Falls back to a no-op implementation if pino
 * fails to initialise in the host environment.
 */
export class PinoLogger {
  private logger: pino.Logger;
  private isAvailable = true;

  private static sharedOutputChannel?: OutputChannel;

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
      this.logger = createFallbackLogger();
    }
  }

  /**
   * Configure a shared VS Code output channel used by all logger instances.
   * @param channel - Output channel to use for human-readable log messages.
   */
  static configureOutputChannel(channel: OutputChannel | undefined): void {
    PinoLogger.sharedOutputChannel = channel;
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
  info(message: string, metadata?: LogMetadata): void {
    this.logger.info(metadata || {}, message);
    this.appendToOutputChannel('INFO', message, metadata);
  }

  /**
   * Logs a debug message using Pino.
   * @param message - The message to log.
   */
  debug(message: string): void {
    this.logger.debug({}, message);
    this.appendToOutputChannel('DEBUG', message);
  }

  /**
   * Logs a warning message using Pino.
   * @param message - The message to log.
   * @param metadata - Optional metadata to include with the log.
   */
  warn(message: string, metadata?: LogMetadata): void {
    this.logger.warn(metadata || {}, message);
    this.appendToOutputChannel('WARN', message, metadata);
  }

  /**
   * Logs an error message using Pino.
   * @param message - The message to log.
   * @param metadata - Optional metadata to include with the log.
   */
  error(message: string, metadata?: LogMetadata): void {
    this.logger.error(metadata || {}, message);
    this.appendToOutputChannel('ERROR', message, metadata);
  }

  /**
   * Logs a fatal error message using Pino (used for action failures).
   * @param message - The failure message.
   * @param metadata - Optional metadata to include with the failure.
   */
  setFailed(message: string, metadata?: LogMetadata): void {
    this.logger.fatal(metadata || {}, `Action failed: ${message}`);
    this.appendToOutputChannel('FATAL', `Action failed: ${message}`, metadata);
  }

  /**
   * Executes a grouped operation with Pino child logger context.
   * @param name - The name of the group.
   * @param fn - The function to execute within the group.
   * @returns A promise that resolves when the group operation completes.
   */
  async group<T>(name: string, fn: () => Promise<T>): Promise<T> {
    const childLogger = this.logger.child({ group: name });
    const originalLogger = this.logger;

    this.logger = childLogger;
    childLogger.info(`Starting group: ${name}`);
    this.appendToOutputChannel('GROUP', `Starting group: ${name}`);

    try {
      const result = await fn();
      childLogger.info(`Completed group: ${name}`);
      this.appendToOutputChannel('GROUP', `Completed group: ${name}`);
      return result;
    } catch (error) {
      childLogger.error({ error }, `Failed in group: ${name}`);
      this.appendToOutputChannel('ERROR', `Failed in group: ${name}`, {
        error: this.normalizeError(error),
      });
      throw error;
    } finally {
      this.logger = originalLogger;
    }
  }

  private appendToOutputChannel(level: string, message: string, metadata?: LogMetadata): void {
    const channel = PinoLogger.sharedOutputChannel;
    if (!channel) {
      return;
    }

    const formattedMetadata = this.formatMetadata(metadata);
    const line = formattedMetadata
      ? `[${level}] ${message} ${formattedMetadata}`
      : `[${level}] ${message}`;
    channel.appendLine(line);
  }

  private formatMetadata(metadata?: LogMetadata): string | undefined {
    if (!metadata || Object.keys(metadata).length === 0) {
      return undefined;
    }

    const normalized = Object.entries(metadata).reduce<Record<string, unknown>>(
      (accumulator, [key, value]) => {
        accumulator[key] = value instanceof Error ? value.message : value;
        return accumulator;
      },
      {},
    );

    return this.safeStringify(normalized);
  }

  private normalizeError(error: unknown): string {
    if (error instanceof Error) {
      return error.stack || error.message;
    }
    if (typeof error === 'object' && error !== null) {
      return this.safeStringify(error);
    }
    return String(error);
  }

  private safeStringify(value: unknown): string {
    if (typeof value === 'string') {
      return value;
    }
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
}

function createFallbackLogger(): pino.Logger {
  const noop = (..._args: unknown[]) => {
    /* no-op */
  };

  const fallback: Record<string, unknown> = {};
  fallback.info = noop;
  fallback.debug = noop;
  fallback.warn = noop;
  fallback.error = noop;
  fallback.fatal = noop;
  fallback.child = () => fallback;

  return fallback as unknown as pino.Logger;
}
