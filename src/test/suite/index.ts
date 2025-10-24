import { once } from 'node:events';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

import { glob } from 'glob';
import { run as runNodeTests } from 'node:test';

import { PARENT_DIRECTORY_SEGMENT } from '@/types';

export async function run(): Promise<void> {
  const testsRoot = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    PARENT_DIRECTORY_SEGMENT,
  );

  console.log('Test runner starting...');
  console.log('Tests root:', testsRoot);

  const files = await glob('**/*.test.js', { cwd: testsRoot, absolute: true });

  console.log('Found test files:', files);

  let failureCount = 0;
  const testStream = runNodeTests({
    files,
    isolation: 'none',
    setup: (stream) => {
      stream.on('test:fail', () => {
        failureCount += 1;
      });
    },
  });

  await once(testStream, 'end');

  if (failureCount > 0) {
    throw new Error(`${failureCount} tests failed.`);
  }
}
