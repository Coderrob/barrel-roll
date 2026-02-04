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
 * Minimal runtime shape for logging implementations and test doubles.
 */
export interface LoggerInstance {
  isLoggerAvailable(): boolean;
  info(message: string, metadata?: Record<string, unknown>): void;
  debug(message: string, metadata?: Record<string, unknown>): void;
  warn(message: string, metadata?: Record<string, unknown>): void;
  error(message: string, metadata?: Record<string, unknown>): void;
  fatal(message: string, metadata?: Record<string, unknown>): void;
  group?<T>(name: string, fn: () => Promise<T>): Promise<T>;
  child?(bindings: Record<string, unknown>): LoggerInstance;
}

/**
 * Interface for output channel used by logger.
 */
export interface OutputChannel {
  appendLine(value: string): void;
}

/**
 * Constructor interface for logger implementations.
 */
export interface LoggerConstructor {
  new (...args: unknown[]): LoggerInstance;
  configureOutputChannel(channel?: OutputChannel): void;
}
