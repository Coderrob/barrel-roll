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
 * No-op logger implementation that mimics pino.Logger interface.
 * Useful as a fallback when Pino logger initialization fails.
 */
export class NoopLogger implements ILogger {
  // Pino.Logger properties
  level = 'silent';
  levelVal = 100;
  msgPrefix = '';

  /**
   * Logs an info message (no-op).
   * @param _message - Message to log as failure.
   * @param _metadata - Optional metadata for the failure.
   */
  info(_message: string, _metadata?: ILogMetadata): void {
    /* No-op */
  }

  /**
   * Logs a debug message (no-op).
   * @param _message - Message to log as failure.
   * @param _metadata - Optional metadata for the failure.
   */
  debug(_message: string, _metadata?: ILogMetadata): void {
    /* No-op */
  }

  /**
   * Logs a warning message (no-op).
   * @param _message - Message to log as failure.
   * @param _metadata - Optional metadata for the failure.
   */
  warning(_message: string, _metadata?: ILogMetadata): void {
    /* No-op */
  }

  /**
   * Logs an error message (no-op).
   * @param _message - Message to log as failure.
   * @param _metadata - Optional metadata for the failure.
   */
  error(_message: string, _metadata?: ILogMetadata): void {
    /* No-op */
  }

  /**
   * Logs a fatal message (no-op).
   * @param _message - Message to log as failure.
   * @param _metadata - Optional metadata for the failure.
   */
  fatal(_message: string, _metadata?: ILogMetadata): void {
    /* No-op */
  }

  /**
   * Logs a trace message (no-op).
   * @param _message - Message to log as failure.
   * @param _metadata - Optional metadata for the failure.
   */
  trace(_message: string, _metadata?: ILogMetadata): void {
    /* No-op */
  }

  /**
   * Creates a child logger (returns self for no-op behavior).
   * @param _obj - Child logger configuration.
   * @returns A new NoopLogger instance.
   */
  child(_obj: unknown): NoopLogger {
    return new NoopLogger();
  }

  /**
   * Creates a child logger with bindings (returns self for no-op behavior).
   * @param _message - Message to log as failure.
   * @param _metadata - Optional metadata for the failure.
   */
  setFailed(_message: string, _metadata?: ILogMetadata): void {
    /* No-op */
  }

  /**
   * Executes a grouped operation (no-op).
   * @param _name - Name of the group.
   * @param _fn - Function to execute within the group.
   * @returns The result of the function execution.
   */
  group<T>(_name: string, _fn: () => Promise<T>): Promise<T> {
    return _fn();
  }
}
