import { once } from 'node:events';
import * as path from 'node:path';

import { glob } from 'glob';
import { run as runNodeTests } from 'node:test';

import { PARENT_DIRECTORY_SEGMENT } from '../../types/index.js';

export async function run(): Promise<void> {
  const testsRoot = path.resolve(__dirname, PARENT_DIRECTORY_SEGMENT);

  console.log('Test runner starting...');
  console.log('Tests root:', testsRoot);

  const files = await glob('**/*.test.js', { cwd: testsRoot, absolute: true });

  console.log('Found test files:', files);

  let failureCount = 0;
  let passCount = 0;
  const testStream = runNodeTests({
    files,
    isolation: 'none',
    setup: (stream) => {
      stream.on('test:fail', (data) => {
        failureCount += 1;
        console.log('Test failed:', data.name);
      });
      stream.on('test:pass', (data) => {
        passCount += 1;
        console.log('Test passed:', data.name);
      });
    },
  });

  await once(testStream, 'end');

  console.log(`Tests complete: ${passCount} passed, ${failureCount} failed`);

  if (failureCount > 0) {
    throw new Error(`${failureCount} tests failed.`);
  }
}
