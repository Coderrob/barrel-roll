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

import type { OutputChannel } from 'vscode';

import { isObject, isString } from '../utils/guards.js';

export type LogMetadata = Record<string, unknown>;

export enum LogLevel {
  Debug = 'debug',
  Info = 'info',
  Warn = 'warn',
  Error = 'error',
  Fatal = 'fatal',
}

/**
 * Configuration options for the OutputChannelLogger.
 */
export interface LoggerOptions {
  /** Minimum log level to emit. Defaults to LogLevel.Info. */
  level?: LogLevel;
  /** Whether to also log to the console. Defaults to true. */
  console?: boolean;
}

/**
 * A logger abstraction over VS Code's OutputChannel API.
 * Provides structured logging with metadata support and optional console output.
 */
export class OutputChannelLogger {
  private static sharedOutputChannel?: OutputChannel;
  private readonly options: Required<LoggerOptions>;
  private bindings: LogMetadata = {};

  private static readonly LOG_LEVELS: Record<LogLevel, number> = {
    [LogLevel.Debug]: 0,
    [LogLevel.Info]: 1,
    [LogLevel.Warn]: 2,
    [LogLevel.Error]: 3,
    [LogLevel.Fatal]: 4,
  };

  constructor(options?: LoggerOptions) {
    this.options = {
      level: options?.level ?? LogLevel.Info,
      console: options?.console ?? true,
    };
  }

  /**
   * Configure a shared VS Code output channel used by all logger instances.
   * @param channel - Output channel to use for log messages.
   */
  static configureOutputChannel(channel: OutputChannel | undefined): void {
    OutputChannelLogger.sharedOutputChannel = channel;
  }

  /**
   * Check if the logger has an output channel configured.
   * @returns True if an output channel is available.
   */
  public isLoggerAvailable(): boolean {
    return OutputChannelLogger.sharedOutputChannel !== undefined || this.options.console;
  }

  /**
   * Logs an informational message.
   * @param message - The message to log.
   * @param metadata - Optional metadata to include with the log.
   */
  info(message: string, metadata?: LogMetadata): void {
    this.log(LogLevel.Info, message, metadata);
  }

  /**
   * Logs a debug message.
   * @param message - The message to log.
   * @param metadata - Optional metadata to include with the log.
   */
  debug(message: string, metadata?: LogMetadata): void {
    this.log(LogLevel.Debug, message, metadata);
  }

  /**
   * Logs a warning message.
   * @param message - The message to log.
   * @param metadata - Optional metadata to include with the log.
   */
  warn(message: string, metadata?: LogMetadata): void {
    this.log(LogLevel.Warn, message, metadata);
  }

  /**
   * Logs an error message.
   * @param message - The message to log.
   * @param metadata - Optional metadata to include with the log.
   */
  error(message: string, metadata?: LogMetadata): void {
    this.log(LogLevel.Error, message, metadata);
  }

  /**
   * Logs a fatal error message (used for action failures).
   * @param message - The failure message.
   * @param metadata - Optional metadata to include with the failure.
   */
  fatal(message: string, metadata?: LogMetadata): void {
    this.log(LogLevel.Fatal, `Action failed: ${message}`, metadata);
  }

  /**
   * Creates a child logger with additional context bindings.
   * @param bindings - Additional metadata to include with all logs from the child logger.
   * @returns A new logger instance with the bindings applied.
   */
  child(bindings: LogMetadata): OutputChannelLogger {
    const childLogger = new OutputChannelLogger(this.options);
    childLogger.bindings = { ...this.bindings, ...bindings };
    return childLogger;
  }

  /**
   * Executes a grouped operation with child logger context.
   * @param name - The name of the group.
   * @param fn - The function to execute within the group.
   * @returns A promise that resolves when the group operation completes.
   */
  async group<T>(name: string, fn: () => Promise<T>): Promise<T> {
    const childLogger = this.child({ group: name });
    childLogger.log(LogLevel.Info, `Starting group: ${name}`);

    try {
      const result = await fn();
      childLogger.log(LogLevel.Info, `Completed group: ${name}`);
      return result;
    } catch (error) {
      childLogger.log(LogLevel.Error, `Failed in group: ${name}`, {
        error: this.normalizeError(error),
      });
      throw error;
    }
  }

  private log(level: LogLevel, message: string, metadata?: LogMetadata): void {
    if (!this.shouldLog(level)) return;

    const mergedMetadata = { ...this.bindings, ...metadata };
    const formattedLine = this.formatLine(level, message, mergedMetadata);

    this.writeToOutputChannel(formattedLine);
    this.writeToConsole(level, formattedLine);
  }

  private shouldLog(level: LogLevel): boolean {
    return (
      OutputChannelLogger.LOG_LEVELS[level] >= OutputChannelLogger.LOG_LEVELS[this.options.level]
    );
  }

  private writeToOutputChannel(line: string): void {
    OutputChannelLogger.sharedOutputChannel?.appendLine(line);
  }

  private writeToConsole(level: LogLevel, line: string): void {
    if (!this.options.console) return;

    const consoleMethods: Record<LogLevel, (...args: unknown[]) => void> = {
      [LogLevel.Debug]: console.debug,
      [LogLevel.Info]: console.log,
      [LogLevel.Warn]: console.warn,
      [LogLevel.Error]: console.error,
      [LogLevel.Fatal]: console.error,
    };

    consoleMethods[level](line);
  }

  private formatLine(level: LogLevel, message: string, metadata?: LogMetadata): string {
    const timestamp = new Date().toISOString();
    const formattedMetadata = this.formatMetadata(metadata);
    const levelTag = `[${level.toUpperCase()}]`;

    return formattedMetadata
      ? `${timestamp} ${levelTag} ${message} ${formattedMetadata}`
      : `${timestamp} ${levelTag} ${message}`;
  }

  private formatMetadata(metadata?: LogMetadata): string | undefined {
    if (!metadata || Object.keys(metadata).length === 0) return;

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
    if (error instanceof Error) return error.stack || error.message;
    if (isObject(error)) return this.safeStringify(error);
    return String(error);
  }

  private safeStringify(value: unknown): string {
    if (isString(value)) return value;
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
}
