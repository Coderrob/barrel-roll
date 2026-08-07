#!/usr/bin/env node

const assert = require('node:assert/strict');
const { rmSync } = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const repositoryRoot = path.resolve(__dirname, '..');
const compilerConfiguration = 'tsconfig.test-suite.json';
const outputDirectories = [
  path.join(repositoryRoot, 'dist', 'src'),
  path.join(repositoryRoot, 'dist', 'test'),
];

function assertSafeOutputDirectory(outputDirectory) {
  const relativePath = path.relative(repositoryRoot, outputDirectory);
  assert.ok(
    relativePath && !relativePath.startsWith('..') && !path.isAbsolute(relativePath),
    `Refusing to remove compiler output outside the repository: ${outputDirectory}`,
  );
}

function removeStaleCompilerOutputs() {
  for (const outputDirectory of outputDirectories) {
    assertSafeOutputDirectory(outputDirectory);
    rmSync(outputDirectory, { force: true, recursive: true });
  }
}

function compileTests() {
  const compiler = require.resolve('typescript/bin/tsc');
  const result = spawnSync(process.execPath, [compiler, '-p', compilerConfiguration], {
    cwd: repositoryRoot,
    stdio: 'inherit',
  });

  if (result.error) {
    throw new Error('Unable to start the TypeScript test compiler', { cause: result.error });
  }
  if (result.signal) {
    throw new Error(`TypeScript test compilation terminated by signal ${result.signal}`);
  }
  assert.notStrictEqual(result.status, null, 'TypeScript test compiler returned no exit status');
  return result.status;
}

removeStaleCompilerOutputs();
process.exitCode = compileTests();
