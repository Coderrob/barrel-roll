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

/**
 * Supported log levels
 */
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  FAILED = 'failed',
  GROUP = 'group',
}

/**
 * Log filter function type
 */
export type LogFilter = (
  level: string,
  message: string,
  metadata?: Record<string, unknown>,
) => boolean;

/**
 * Sampling strategy interface for controlling log sampling
 */
export interface ISamplingStrategy {
  /**
   * Determines if a log should be sampled
   * @param level - Log level
   * @param message - Log message
   * @param metadata - Optional metadata
   * @returns true if the log should be included, false if filtered out
   */
  shouldSample?(level: LogLevel, message: string, metadata?: ILogMetadata): boolean;

  /** Sample rate (0.0 to 1.0) */
  rate: number;
  /** Maximum logs per time window */
  maxPerWindow?: number;
  /** Time window in milliseconds */
  windowMs?: number;
}

/**
 * Represents a single log call captured by the
 * mock logger
 */
export interface ILogCall {
  /**
   * The log level
   */
  level: LogLevel;

  /**
   * The log message
   */
  message: string;

  /**
   * Optional metadata associated with the log
   */
  metadata?: ILogMetadata;

  /**
   * Timestamp when the log was captured
   */
  timestamp: Date;
}

/**
 * Metadata associated with log messages, useful for
 * enhanced logging with contextual information.
 */
export interface ILogMetadata {
  /**
   * A title for the annotation.
   * */
  title?: string;
  /**
   * The path of the file for which the annotation
   * should be created.
   */
  file?: string;
  /**
   * The start line for the annotation.
   */
  startLine?: number;
  /**
   * The end line for the annotation. Defaults to
   * `startLine` when `startLine` is provided.
   */
  endLine?: number;
  /**
   * The start column for the annotation. Cannot be sent
   * when `startLine` and `endLine` are different values.
   */
  startColumn?: number;
  /**
   * The end column for the annotation. Cannot be sent when
   * `startLine` and `endLine` are different values.
   *
   * Defaults to `startColumn` when `startColumn` is provided.
   */
  endColumn?: number;
  /**
   * Additional custom metadata fields for structured logging
   */
  [key: string]: unknown;
}

/**
 * Logger metrics and statistics
 */
export interface ILoggerMetrics {
  /**
   * Total number of logs processed
   */
  totalLogs: number;
  /**
   * Logs grouped by level
   */
  logsByLevel: Record<string, number>;
  /**
   * Number of error log
   */
  errors: number;
  /**
   * Number of warning logs
   */
  warnings: number;
  /**
   * Average logs per second
   */
  logRate: number;
  /**
   * Timestamp when metrics were last updated
   */
  lastUpdated: number;
  /**
   * Number of info level logs
   */
  infoLogs: number;
  /**
   * Number of debug level logs
   */
  debugLogs: number;
  /**
   * Number of warning level logs
   */
  warningLogs: number;
  /**
   * Number of error level logs
   */
  errorLogs: number;
  /**
   * Number of failed logs
   */
  failedLogs: number;
  /**
   * Number of grouped operations
   */
  groupedOperations: number;
  /**
   * Timestamp of first log
   */
  firstLogTime?: number;
  /**
   * Timestamp of last log
   */
  lastLogTime?: number;
  /**
   * Average logs per minute
   */
  logsPerMinute: number;
  /**
   * Peak logs per minute
   */
  peakLogsPerMinute: number;
  /**
   * Average size of log messages
   */
  averageLogSize: number;
  /**
   * Uptime in milliseconds
   */
  uptime: number;
}

/**
 * Interface for logging operations.
 */
export interface ILogger {
  /**
   * Logs an informational message.
   * @param message - The message to log.
   * @param metadata - Optional metadata to include with the log.
   */
  info(message: string, metadata?: ILogMetadata): void;

  /**
   * Logs a debug message.
   * @param message - The message to log.
   */
  debug(message: string): void;

  /**
   * Logs a warning message.
   * @param message - The message to log.
   * @param metadata - Optional metadata to include with the log.
   */
  warning(message: string, metadata?: ILogMetadata): void;

  /**
   * Logs an error message.
   * @param message - The message to log.
   * @param metadata - Optional metadata to include with the log.
   */
  error(message: string, metadata?: ILogMetadata): void;

  /**
   * Sets the action as failed with the given message.
   * @param message - The failure message.
   * @param metadata - Optional metadata to include with the failure.
   */
  setFailed(message: string, metadata?: ILogMetadata): void;

  /**
   * Logs a group of messages.
   * @param name - The name of the group.
   * @param fn - The function to execute within the group.
   */
  group<T>(name: string, fn: () => Promise<T>): Promise<T>;
}
