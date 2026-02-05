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

import { Semaphore } from '../../../utils/semaphore.js';

describe('Semaphore', () => {
  it('should queue waiters and release permits in order', async () => {
    const semaphore = new Semaphore(1);
    const events: string[] = [];

    await semaphore.acquire();
    events.push('first');

    const secondAcquire = semaphore.acquire().then(() => {
      events.push('second');
    });

    await new Promise((resolve) => setImmediate(resolve));
    assert.deepStrictEqual(events, ['first']);
    assert.strictEqual(semaphore.availablePermits, 0);

    semaphore.release();
    await secondAcquire;

    assert.deepStrictEqual(events, ['first', 'second']);
    assert.strictEqual(semaphore.availablePermits, 0);

    semaphore.release();
    assert.strictEqual(semaphore.availablePermits, 1);
  });

  it('should no-op release when there are no waiters', () => {
    const semaphore = new Semaphore(2);
    semaphore.release();
    assert.strictEqual(semaphore.availablePermits, 3);
    assert.strictEqual(semaphore.waitingCount, 0);
  });
});
