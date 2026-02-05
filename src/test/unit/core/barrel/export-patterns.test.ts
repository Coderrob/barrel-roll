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

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  detectExtensionFromBarrelContent,
  extractAllExportPaths,
  extractExtensionFromLine,
  extractExportPath,
} from '../../../../core/barrel/export-patterns.js';

describe('Export Path Utils', () => {
  it('should extract export paths from single and multiline exports', () => {
    const single = "export { alpha } from './alpha';";
    const multiline = `export {
  alpha,
  beta,
} from './beta';`;

    assert.strictEqual(extractExportPath(single), './alpha');
    assert.strictEqual(extractExportPath(multiline), './beta');
  });

  it('should extract and normalize all export paths', () => {
    const content = [
      "export * from './alpha.js';",
      "export { beta } from './beta/index';",
      'const ignore = true;',
      '',
    ].join('\n');

    const paths = extractAllExportPaths(content);

    assert.strictEqual(paths.has('./alpha'), true);
    assert.strictEqual(paths.has('./beta'), true);
    assert.strictEqual(paths.size, 2);
  });

  it('should detect extension patterns from barrel content', () => {
    assert.strictEqual(detectExtensionFromBarrelContent('const a = 1;'), null);

    const jsContent = "export { alpha } from './alpha.js';";
    assert.strictEqual(detectExtensionFromBarrelContent(jsContent), '.js');

    const mjsContent = "export { alpha } from './alpha.mjs';";
    assert.strictEqual(detectExtensionFromBarrelContent(mjsContent), '.mjs');

    const noExtContent = "export { alpha } from './alpha';";
    assert.strictEqual(detectExtensionFromBarrelContent(noExtContent), '');
  });

  it('should return null for extension checks on non-export lines', () => {
    assert.strictEqual(extractExtensionFromLine('const alpha = 1;'), null);
  });
});
