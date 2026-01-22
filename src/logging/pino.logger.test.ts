import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it, mock } from 'node:test';
import type { Logger, LoggerOptions } from 'pino';
import type { OutputChannel } from 'vscode';

type PinoLoggerClass = (typeof import('./pino.logger.js'))['PinoLogger'];

type CallStore = {
  info: Array<[unknown, string]>;
  debug: Array<[unknown, string]>;
  warn: Array<[unknown, string]>;
  error: Array<[unknown, string]>;
  fatal: Array<[unknown, string]>;
};

const createCallStore = (): CallStore => ({
  info: [],
  debug: [],
  warn: [],
  error: [],
  fatal: [],
});

const makeLogger = (calls: CallStore, childArgs: unknown[], childLogger?: Logger): Logger => {
  return {
    info(metadata: unknown, message: string) {
      calls.info.push([metadata, message]);
    },
    debug(metadata: unknown, message: string) {
      calls.debug.push([metadata, message]);
    },
    warn(metadata: unknown, message: string) {
      calls.warn.push([metadata, message]);
    },
    error(metadata: unknown, message: string) {
      calls.error.push([metadata, message]);
    },
    fatal(metadata: unknown, message: string) {
      calls.fatal.push([metadata, message]);
    },
    child(metadata: unknown) {
      childArgs.push(metadata);
      return childLogger ?? makeLogger(createCallStore(), childArgs);
    },
  } as unknown as Logger;
};

let mockPinoLogger: Logger;
let mockChildLogger: Logger;
let rootCalls: CallStore;
let childCalls: CallStore;
let childMetadataArgs: unknown[];
let outputLines: string[];
let lastOptions: LoggerOptions | undefined;
let shouldThrowOnCreate = false;
let consoleWarnings: unknown[][];
let PinoLogger: PinoLoggerClass;

const originalWarn = console.warn.bind(console);

mock.module('pino', {
  defaultExport: (options?: LoggerOptions) => {
    lastOptions = options;
    if (shouldThrowOnCreate) {
      throw new Error('pino init failure');
    }
    return mockPinoLogger;
  },
});

beforeEach(async () => {
  rootCalls = createCallStore();
  childCalls = createCallStore();
  childMetadataArgs = [];
  outputLines = [];
  lastOptions = undefined;
  shouldThrowOnCreate = false;
  consoleWarnings = [];
  console.warn = (...args: unknown[]) => {
    consoleWarnings.push(args);
  };

  mockChildLogger = makeLogger(childCalls, childMetadataArgs);
  mockPinoLogger = makeLogger(rootCalls, childMetadataArgs, mockChildLogger);

  ({ PinoLogger } = await import('./pino.logger.js'));

  PinoLogger.configureOutputChannel({
    appendLine(line: string) {
      outputLines.push(line);
    },
  } as OutputChannel);
});

afterEach(() => {
  PinoLogger.configureOutputChannel(undefined);
  console.warn = originalWarn;
});

describe('PinoLogger', () => {
  it('uses default configuration when no options are provided', () => {
    const logger = new PinoLogger();

    assert.ok(lastOptions);
    const transport = lastOptions?.transport as unknown as { target?: string } | undefined;
    assert.strictEqual(transport?.target, 'pino-pretty');
    assert.strictEqual(logger.isLoggerAvailable(), true);
  });

  it('passes provided options through to pino', () => {
    const options: LoggerOptions = { level: 'debug' };
    const logger = new PinoLogger(options);

    assert.strictEqual(lastOptions, options);
    logger.info('custom message');
    assert.strictEqual(rootCalls.info.length, 1);
  });

  it('logs info messages with metadata', () => {
    const logger = new PinoLogger();

    logger.info('initialized', { service: 'barrel' });

    assert.deepStrictEqual(rootCalls.info, [[{ service: 'barrel' }, 'initialized']]);
    assert.deepStrictEqual(outputLines, ['[INFO] initialized {"service":"barrel"}']);
  });

  it('omits metadata from debug output when none is provided', () => {
    const logger = new PinoLogger();

    logger.debug('diagnostic');

    assert.deepStrictEqual(rootCalls.debug, [[{}, 'diagnostic']]);
    assert.deepStrictEqual(outputLines, ['[DEBUG] diagnostic']);
  });

  it('logs warnings with metadata', () => {
    const logger = new PinoLogger();

    logger.warn('threshold exceeded', { attempt: 3 });

    assert.deepStrictEqual(rootCalls.warn, [[{ attempt: 3 }, 'threshold exceeded']]);
    assert.deepStrictEqual(outputLines, ['[WARN] threshold exceeded {"attempt":3}']);
  });

  it('normalizes errors before logging', () => {
    const logger = new PinoLogger();
    const error = new Error('boom');

    logger.error('operation failed', { error });

    assert.deepStrictEqual(rootCalls.error, [[{ error }, 'operation failed']]);
    assert.deepStrictEqual(outputLines, ['[ERROR] operation failed {"error":"boom"}']);
  });

  it('leaves string errors unchanged during normalization', () => {
    const logger = new PinoLogger();
    const normalizeError = (
      logger as unknown as { normalizeError(error: unknown): string }
    ).normalizeError.bind(logger);

    assert.strictEqual(normalizeError('fail'), 'fail');
  });

  it('prefixes fatal messages for action failures', () => {
    const logger = new PinoLogger();

    logger.fatal('deploy');

    assert.deepStrictEqual(rootCalls.fatal, [[{}, 'Action failed: deploy']]);
    assert.deepStrictEqual(outputLines, ['[FATAL] Action failed: deploy']);
  });

  it('skips output channel writes when none is configured', () => {
    const logger = new PinoLogger();
    PinoLogger.configureOutputChannel(undefined);

    logger.info('quiet');

    assert.deepStrictEqual(outputLines, []);
  });

  it('stringifies circular metadata safely', () => {
    const logger = new PinoLogger();
    const circular: Record<string, unknown> = {};
    circular.self = circular;

    logger.info('circular', circular);

    assert.deepStrictEqual(rootCalls.info, [[circular, 'circular']]);
    assert.deepStrictEqual(outputLines, ['[INFO] circular [object Object]']);
  });

  it('uses a child logger when grouping operations and restores afterward', async () => {
    const logger = new PinoLogger();

    const result = await logger.group('build', async () => 42);

    assert.strictEqual(result, 42);
    assert.deepStrictEqual(childMetadataArgs, [{ group: 'build' }]);
    assert.deepStrictEqual(childCalls.info, [
      [{}, 'Starting group: build'],
      [{}, 'Completed group: build'],
    ]);
    assert.deepStrictEqual(outputLines, [
      '[GROUP] Starting group: build',
      '[GROUP] Completed group: build',
    ]);

    logger.debug('post-group');
    assert.deepStrictEqual(childCalls.debug, []);
    assert.deepStrictEqual(rootCalls.debug.at(-1), [{}, 'post-group']);
  });

  it('propagates errors from grouped operations with normalized metadata', async () => {
    const logger = new PinoLogger();
    const failure = { code: 'EFAIL' };

    await assert.rejects(
      logger.group('failures', async () => {
        throw failure;
      }),
      (error) => error === failure,
    );

    const expectedMetadata = JSON.stringify({ error: JSON.stringify(failure) });
    assert.deepStrictEqual(childCalls.error, [[{ error: failure }, 'Failed in group: failures']]);
    assert.strictEqual(outputLines.at(-1), `[ERROR] Failed in group: failures ${expectedMetadata}`);
  });

  it('falls back to a no-op logger when pino initialization fails', () => {
    shouldThrowOnCreate = true;

    const logger = new PinoLogger();

    assert.strictEqual(logger.isLoggerAvailable(), false);
    assert.strictEqual(consoleWarnings.length, 1);

    logger.info('fallback');

    assert.deepStrictEqual(rootCalls.info, []);
    assert.deepStrictEqual(outputLines, ['[INFO] fallback']);
  });
});
