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

import { BarrelContentSanitizer } from '../../../../core/barrel/content-sanitizer.js';

describe('BarrelContentSanitizer', () => {
  it('should preserve direct definitions and strip regenerated or external re-exports', () => {
    const sanitizer = new BarrelContentSanitizer();
    const existingContent = [
      "export * from '../external';",
      "export { alpha } from './alpha';",
      'export {',
      '  beta,',
      "} from './beta';",
      '',
      'export const direct = 1;',
    ].join('\n');

    const newContentPaths = new Set<string>(['./alpha', './beta']);

    const result = sanitizer.preserveDefinitionsAndSanitizeExports(
      existingContent,
      newContentPaths,
    );

    const preserved = result.preservedLines.join('\n');

    assert.ok(!preserved.includes("export * from '../external';"));
    assert.ok(!preserved.includes("export { alpha } from './alpha';"));
    assert.ok(!preserved.includes("from './beta';"));
    assert.ok(preserved.includes('export const direct = 1;'));
  });
});
