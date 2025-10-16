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

import * as pino from 'pino';

import type { IEnvironmentVariables } from '../types/env.js';

import { IPinoLoggerConfig } from './pino/types.js';

/**
 * Environment-based configuration resolver
 */
export class LoggerConfigResolver {
  /**
   * Resolve configuration from environment variables and defaults
   * @param overrides - Partial configuration to override defaults
   * @param env - Environment variables (defaults to process.env for production use)
   */
  static resolve(
    overrides: Partial<IPinoLoggerConfig> = {},
    env: IEnvironmentVariables = process.env as IEnvironmentVariables,
  ): IPinoLoggerConfig {
    const config = this.createBaseConfig(env);
    this.applyEnvironmentSpecificSettings(config, env);
    return { ...config, ...overrides };
  }

  /**
   * Create the base configuration with common settings
   * @param env - Environment variables
   * @return Base IPinoLoggerConfig object
   */
  private static createBaseConfig(env: IEnvironmentVariables): IPinoLoggerConfig {
    const isGitHubActions = Boolean(env.GITHUB_ACTIONS);

    return {
      level: (env.LOG_LEVEL as pino.LevelWithSilent) || 'info',
      prettyPrint: this.isDevelopment(env),
      enableCore: isGitHubActions,
      enablePino: true,
      base: {
        service: 'github-action',
        version: env.npm_package_version || '1.0.0',
        ...(isGitHubActions && this.getGitHubMetadata(env)),
      },
    };
  }

  /**
   * Apply environment-specific transport settings
   * @param config - The configuration object to modify
   * @param env - Environment variables
   */
  private static applyEnvironmentSpecificSettings(
    config: IPinoLoggerConfig,
    env: IEnvironmentVariables,
  ) {
    if (this.isProduction(env)) {
      config.transport = this.createProductionTransport(env);
    } else if (this.isDevelopment(env)) {
      config.transport = this.createDevelopmentTransport();
    }
  }

  /**
   * Check if running in development environment
   * @param env - Environment variables
   * @return True if in development mode, false otherwise
   */
  private static isDevelopment(env: IEnvironmentVariables): boolean {
    return env.NODE_ENV === 'development';
  }

  /**
   * Check if running in production environment
   * @param env - Environment variables
   */
  private static isProduction(env: IEnvironmentVariables): boolean {
    return env.NODE_ENV === 'production';
  }

  /**
   * Get GitHub Actions metadata for logging
   * @param env - Environment variables
   * @return Object with GitHub metadata
   */
  private static getGitHubMetadata(env: IEnvironmentVariables) {
    return {
      repository: env.GITHUB_REPOSITORY,
      workflow: env.GITHUB_WORKFLOW,
      runId: env.GITHUB_RUN_ID,
      ref: env.GITHUB_REF,
      sha: env.GITHUB_SHA,
    };
  }

  /**
   * Create transport configuration for production
   * @param env - Environment variables
   * @return Transport options for production logging
   */
  private static createProductionTransport(env: IEnvironmentVariables) {
    return {
      target: 'pino/file',
      options: {
        destination: env.LOG_FILE || './logs/app.log',
        mkdir: true,
      },
    };
  }

  /**
   * Create transport configuration for development
   * @return Transport options for development logging
   */
  private static createDevelopmentTransport() {
    return {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'yyyy-mm-dd HH:MM:ss',
        ignore: 'pid,hostname',
        singleLine: false,
      },
    };
  }

  /**
   * Create Pino options from resolved config
   * @param config - The resolved IPinoLoggerConfig
   * @returns Pino LoggerOptions object
   */
  static toPinoOptions(config: IPinoLoggerConfig): pino.LoggerOptions {
    return {
      level: config.level || 'info',
      transport: config.transport,
      base: config.base || {},
    };
  }
}
