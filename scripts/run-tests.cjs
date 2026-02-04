#!/usr/bin/env node

/**
 * Cross-platform test runner that expands glob patterns before passing to node --test
 * This is needed because Windows doesn't expand globs in the same way as Unix shells
 */

const { spawn } = require('node:child_process');
const { globSync } = require('glob');

// Define test file patterns
const patterns = [
  'dist/test/unit/**/*.test.js',
  'dist/test/integration/**/*.test.js',
  // Also include tests emitted under dist/src (tsc may emit to this path depending on config)
  'dist/src/test/unit/**/*.test.js',
  'dist/src/test/integration/**/*.test.js',
];

// Expand all glob patterns to actual file paths
const testFiles = patterns.flatMap((pattern) => globSync(pattern, { cwd: process.cwd() }));

if (testFiles.length === 0) {
  console.error('No test files found matching patterns:', patterns);
  process.exit(1);
}

// Run node --test with the expanded file list
const nodeTest = spawn('node', ['--test', ...testFiles], {
  stdio: 'inherit',
  shell: false,
});

nodeTest.on('close', (code) => {
  process.exit(code);
});
