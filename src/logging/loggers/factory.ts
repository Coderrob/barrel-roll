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

import { PinoLogger } from '../pino/logger.js';
import { LogLevel } from '../types.js';
import { CompositeLogger } from './composite.js';

/**
 * Factory function to create a CompositeLogger with CoreLogger and PinoLogger.
 * @param pinoOptions - Optional Pino configuration options
 * @returns A CompositeLogger instance with both CoreLogger and PinoLogger
 */
export function createCompositeLogger(pinoOptions?: pino.LoggerOptions): CompositeLogger {
  const pinoLogger = new PinoLogger(pinoOptions);
  return new CompositeLogger([pinoLogger]);
}

/**
 * Factory function to create a PinoLogger with default configuration.
 * @returns A PinoLogger instance configured for production environment
 *
 * @example
 * ```typescript
 * const logger = createPinoLogger();
 * logger.info('Starting application');
 * ```
 */
export function createPinoLogger(): PinoLogger {
  return new PinoLogger({
    level: process.env.LOG_LEVEL || LogLevel.INFO,
    transport: getDefaultTransport(),
    base: getDefaultBase(),
  });
}

/**
 * Get the default transport configuration based on environment
 * @returns Transport options for development, undefined for production
 */
function getDefaultTransport() {
  return process.env.NODE_ENV !== 'production'
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'yyyy-mm-dd HH:MM:ss',
          ignore: 'pid,hostname',
        },
      }
    : undefined;
}

/**
 * Get the default base configuration
 * @returns Base metadata including service name and version
 */
function getDefaultBase() {
  return {
    service: 'github-action',
    version: process.env.npm_package_version || '1.0.0',
  };
}
