import * as path from 'path';
import { fileURLToPath } from 'url';

import { glob } from 'glob';
import Mocha from 'mocha';

export async function run(): Promise<void> {
  // Create the mocha test
  const mocha = new Mocha({
    ui: 'tdd',
    color: true,
  });

  const testsRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

  console.log('Test runner starting...');
  console.log('Tests root:', testsRoot);

  const files = await glob('**/**.test.js', { cwd: testsRoot });

  console.log('Found test files:', files);

  // Add files to the test suite
  files.forEach((f) => mocha.addFile(path.resolve(testsRoot, f)));

  // Run the tests
  return new Promise((resolve, reject) => {
    mocha.run((failures) => {
      if (failures > 0) {
        reject(new Error(`${failures} tests failed.`));
      } else {
        resolve();
      }
    });
  });
}
