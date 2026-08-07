#!/usr/bin/env node

const assert = require('node:assert/strict');

const { ExportCache } = require('../dist/src/core/barrel/export-cache.js');
const { ExportParser } = require('../dist/src/core/parser/export.parser.js');

const CACHE_ENTRY_COUNT = 1_000;
const CACHE_LIMIT = 64;
const HEAP_GROWTH_LIMIT_BYTES = 16 * 1024 * 1024;
const PARSER_ITERATIONS = 40;
const SAMPLE_COUNT = 4;
const LEAK_PRONE_RESOURCE_TYPES = new Set([
  'FSReqCallback',
  'TCPSocketWrap',
  'TCPServerWrap',
  'Timeout',
]);

if (typeof global.gc !== 'function') {
  throw new Error('Memory check requires Node.js --expose-gc');
}

const fileSystem = {
  async getFileStats(filePath) {
    return { mtime: new Date(Number(filePath.slice(1))) };
  },
  async readFile(filePath) {
    return `export const value${filePath.slice(1)} = true;`;
  },
};

const exportParser = {
  extractExports(content) {
    return [{ name: content, typeOnly: false }];
  },
};

async function exerciseBoundedCache() {
  const cache = new ExportCache(fileSystem, exportParser, { maxSize: CACHE_LIMIT });
  for (let index = 0; index < CACHE_ENTRY_COUNT; index += 1) {
    await cache.resolveExports(`/${index}`);
  }
  assert.equal(cache.size, CACHE_LIMIT, 'export cache must remain bounded');
  cache.clear();
  assert.equal(cache.size, 0, 'export cache must release retained entries');
}

function exerciseParser(parser) {
  for (let index = 0; index < PARSER_ITERATIONS; index += 1) {
    const exports = parser.extractExports(
      `export const value${index} = ${index}; export type Type${index} = string;`,
    );
    assert.equal(exports.length, 2);
  }
}

function collectHeapSample() {
  global.gc();
  global.gc();
  return process.memoryUsage().heapUsed;
}

async function exerciseRuntime(parser) {
  exerciseParser(parser);
  await exerciseBoundedCache();
}

function assertRetainedHeapIsBounded(baseline, samples) {
  assert.equal(samples.length, SAMPLE_COUNT, 'memory check must collect every configured sample');
  const finalSample = samples.at(-1);
  assert.ok(
    Number.isSafeInteger(finalSample),
    'memory check produced an invalid final heap sample',
  );
  const retainedGrowth = finalSample - baseline;
  assert.ok(
    retainedGrowth <= HEAP_GROWTH_LIMIT_BYTES,
    `retained heap grew by ${retainedGrowth} bytes; limit is ${HEAP_GROWTH_LIMIT_BYTES}`,
  );
  return retainedGrowth;
}

function assertNoLeakedAsyncResources() {
  const leakedResources = process
    .getActiveResourcesInfo()
    .filter((resource) => LEAK_PRONE_RESOURCE_TYPES.has(resource));
  assert.deepStrictEqual(leakedResources, [], 'runtime left asynchronous resources active');
}

async function main() {
  const longLivedParser = new ExportParser();
  await exerciseRuntime(longLivedParser);
  const baseline = collectHeapSample();
  const samples = [];

  for (let sample = 0; sample < SAMPLE_COUNT; sample += 1) {
    await exerciseRuntime(longLivedParser);
    samples.push(collectHeapSample());
  }

  const retainedGrowth = assertRetainedHeapIsBounded(baseline, samples);
  assertNoLeakedAsyncResources();

  console.log(
    `Memory check passed: retained heap growth ${retainedGrowth} bytes; cache limit ${CACHE_LIMIT}.`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
