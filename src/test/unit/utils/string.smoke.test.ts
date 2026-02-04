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

import { sortAlphabetically } from '../../../utils/string.js';

describe('String Utils', () => {
  it('should sort alphabetically using default comparison', () => {
    const result = sortAlphabetically(['b', 'a', 'c']);
    assert.deepStrictEqual(result, ['a', 'b', 'c']);
  });

  it('should sort alphabetically using locale options when provided', () => {
    const result = sortAlphabetically(['b', 'a', 'c'], 'en');
    assert.deepStrictEqual(result, ['a', 'b', 'c']);
  });
});
