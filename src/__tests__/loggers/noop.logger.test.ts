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
 */

import { NoopLogger } from '../../logging/index.js';

describe('NoopLogger', () => {
  let logger: NoopLogger;

  afterEach(() => {
    jest.clearAllMocks();
  });

  beforeEach(() => {
    logger = new NoopLogger();
  });

  describe('properties', () => {
    it('should have correct default properties', () => {
      expect(logger.level).toBe('silent');
      expect(logger.levelVal).toBe(100);
      expect(logger.msgPrefix).toBe('');
    });
  });

  describe('logging methods', () => {
    it('should call info without error', () => {
      expect(() => logger.info('test')).not.toThrow();
      expect(() => logger.info('test', { key: 'value' })).not.toThrow();
    });

    it('should call debug without error', () => {
      expect(() => logger.debug('test')).not.toThrow();
      expect(() => logger.debug('test', { key: 'value' })).not.toThrow();
    });

    it('should call warning without error', () => {
      expect(() => logger.warning('test')).not.toThrow();
      expect(() => logger.warning('test', { key: 'value' })).not.toThrow();
    });

    it('should call error without error', () => {
      expect(() => logger.error('test')).not.toThrow();
      expect(() => logger.error('test', { key: 'value' })).not.toThrow();
    });

    it('should call fatal without error', () => {
      expect(() => logger.fatal('test')).not.toThrow();
      expect(() => logger.fatal('test', { key: 'value' })).not.toThrow();
    });

    it('should call trace without error', () => {
      expect(() => logger.trace('test')).not.toThrow();
      expect(() => logger.trace('test', { key: 'value' })).not.toThrow();
    });
  });

  describe('child', () => {
    it('should return a new NoopLogger instance', () => {
      const childLogger = logger.child({});
      expect(childLogger).toBeInstanceOf(NoopLogger);
      expect(childLogger).not.toBe(logger);
    });
  });

  describe('setFailed', () => {
    it('should call setFailed without error', () => {
      expect(() => logger.setFailed('test')).not.toThrow();
      expect(() => logger.setFailed('test', { key: 'value' })).not.toThrow();
    });
  });

  describe('group', () => {
    it('should execute the function and return its result', async () => {
      const result = await logger.group('test', async () => 'success');
      expect(result).toBe('success');
    });

    it('should handle synchronous functions', async () => {
      const result = await logger.group<string>('test', () => Promise.resolve('sync'));
      expect(result).toBe('sync');
    });
  });
});
