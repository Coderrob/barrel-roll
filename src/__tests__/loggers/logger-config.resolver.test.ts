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

import { IPinoLoggerConfig, LoggerConfigResolver, LogLevel } from '../../logging/index.js';
import type { IEnvironmentVariables } from '../../types/env.js';

describe('LoggerConfigResolver', () => {
  describe('resolve', () => {
    it('should resolve default configuration for development', () => {
      const mockEnv: IEnvironmentVariables = {
        NODE_ENV: 'development',
        npm_package_version: '1.0.0',
      };

      const config = LoggerConfigResolver.resolve({}, mockEnv);

      expect(config.level).toBe(LogLevel.INFO);
      expect(config.prettyPrint).toBe(true);
      expect(config.enableCore).toBe(false);
      expect(config.enablePino).toBe(true);
      expect(config.base).toHaveProperty('service', 'github-action');
      expect(config.base).toHaveProperty('version', '1.0.0');
    });

    it('should resolve configuration for CI environment', () => {
      const mockEnv: IEnvironmentVariables = {
        NODE_ENV: 'production',
        GITHUB_ACTIONS: 'true',
        GITHUB_REPOSITORY: 'owner/repo',
        GITHUB_WORKFLOW: 'CI',
        GITHUB_RUN_ID: '123',
        GITHUB_REF: 'refs/heads/main',
        GITHUB_SHA: 'abc123',
        npm_package_version: '1.0.0',
      };

      const config = LoggerConfigResolver.resolve({}, mockEnv);

      expect(config.enableCore).toBe(true);
      expect(config.base).toHaveProperty('repository', 'owner/repo');
      expect(config.base).toHaveProperty('workflow', 'CI');
      expect(config.base).toHaveProperty('runId', '123');
      expect(config.base).toHaveProperty('ref', 'refs/heads/main');
      expect(config.base).toHaveProperty('sha', 'abc123');
    });

    it('should resolve production configuration', () => {
      const mockEnv: IEnvironmentVariables = {
        NODE_ENV: 'production',
        LOG_FILE: '/tmp/app.log',
      };

      const config = LoggerConfigResolver.resolve({}, mockEnv);

      expect(config.prettyPrint).toBe(false);
      expect(config.transport).toBeDefined();
      expect(config.transport).toHaveProperty('target', 'pino/file');
    });

    it('should apply overrides', () => {
      const mockEnv: IEnvironmentVariables = {};
      const overrides: Partial<IPinoLoggerConfig> = {
        level: LogLevel.DEBUG,
        enableCore: true,
        base: { custom: 'value' },
      };

      const config = LoggerConfigResolver.resolve(overrides, mockEnv);

      expect(config.level).toBe(LogLevel.DEBUG);
      expect(config.enableCore).toBe(true);
      expect(config.base).toHaveProperty('custom', 'value');
    });

    it('should respect LOG_LEVEL environment variable', () => {
      const mockEnv: IEnvironmentVariables = {
        LOG_LEVEL: LogLevel.WARNING,
      };

      const config = LoggerConfigResolver.resolve({}, mockEnv);

      expect(config.level).toBe(LogLevel.WARNING);
    });
  });

  describe('toPinoOptions', () => {
    it('should create Pino options from config', () => {
      const config: IPinoLoggerConfig = {
        level: LogLevel.DEBUG,
        base: { service: 'test' },
        transport: {
          target: 'pino-pretty',
          options: { colorize: true },
        },
      };

      const pinoOptions = LoggerConfigResolver.toPinoOptions(config);

      expect(pinoOptions.level).toBe(LogLevel.DEBUG);
      expect(pinoOptions.base).toEqual({ service: 'test' });
      expect(pinoOptions.transport).toBeDefined();
    });

    it('should handle minimal config for Pino options', () => {
      const config: IPinoLoggerConfig = {
        level: LogLevel.INFO,
      };

      const pinoOptions = LoggerConfigResolver.toPinoOptions(config);

      expect(pinoOptions.level).toBe(LogLevel.INFO);
      expect(pinoOptions.base).toEqual({});
    });

    it('should handle config with undefined base for Pino options', () => {
      const config: IPinoLoggerConfig = {
        level: LogLevel.WARNING as any,
        base: undefined,
      };

      const pinoOptions = LoggerConfigResolver.toPinoOptions(config);

      expect(pinoOptions.level).toBe(LogLevel.WARNING);
      expect(pinoOptions.base).toEqual({});
    });

    it('should handle config with null base for Pino options', () => {
      const config: IPinoLoggerConfig = {
        level: LogLevel.ERROR as any,
        base: null as any,
      };

      const pinoOptions = LoggerConfigResolver.toPinoOptions(config);

      expect(pinoOptions.level).toBe(LogLevel.ERROR);
      expect(pinoOptions.base).toEqual({});
    });
  });

  describe('GitHub Actions environment', () => {
    it('should resolve configuration for GitHub Actions environment', () => {
      const mockEnv: IEnvironmentVariables = {
        GITHUB_ACTIONS: 'true',
        GITHUB_RUN_ID: '12345',
        GITHUB_SHA: 'abc123',
        GITHUB_REF: 'refs/heads/main',
        GITHUB_REPOSITORY: 'owner/repo',
        npm_package_version: '1.0.0',
      };

      const config = LoggerConfigResolver.resolve({}, mockEnv);

      expect(config.level).toBe(LogLevel.INFO);
      expect(config.prettyPrint).toBe(false);
      expect(config.enableCore).toBe(true);
      expect(config.enablePino).toBe(true);
      expect(config.base).toEqual({
        service: 'github-action',
        version: '1.0.0',
        runId: '12345',
        sha: 'abc123',
        ref: 'refs/heads/main',
        repository: 'owner/repo',
      });
    });
  });
});
