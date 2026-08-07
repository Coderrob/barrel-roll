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

/**
 * Simple semaphore implementation for concurrency control.
 * Limits the number of concurrent operations that can execute at once.
 */
export class Semaphore {
  private readonly waiting: Array<() => void> = [];

  /**
   * Creates a new semaphore with the specified number of permits.
   * @param permits The number of permits to initialize the semaphore with.
   * @throws {RangeError} When permits is not a positive integer.
   */
  constructor(private permits: number) {
    if (!Number.isInteger(permits) || permits <= 0) {
      throw new RangeError('Semaphore permits must be a positive integer');
    }
  }

  /**
   * Enqueues a resolve callback for later execution when a permit becomes available.
   * @param resolve - The resolve callback to enqueue.
   */
  private enqueueResolve(resolve: () => void): void {
    this.waiting.push(resolve);
  }

  /**
   * Acquires a permit from the semaphore.
   * If no permits are available, the promise will wait until one is released.
   * @returns Promise that resolves when a permit is acquired.
   */
  async acquire(): Promise<void> {
    if (this.permits > 0) {
      this.permits--;
      return;
    }
    return new Promise<void>(this.enqueueResolve.bind(this));
  }

  /**
   * Releases a permit back to the semaphore.
   * If there are waiting callers, the first one in the queue will be resolved.
   */
  release(): void {
    this.permits++;
    if (this.waiting.length === 0) {
      return;
    }
    const [resolve] = this.waiting.splice(0, 1);
    this.permits--;
    resolve();
  }

  /**
   * Returns the current number of available permits.
   * @returns The number of available permits.
   */
  get availablePermits(): number {
    return this.permits;
  }

  /**
   * Returns the number of callers waiting for a permit.
   * @returns The number of waiting callers.
   */
  get waitingCount(): number {
    return this.waiting.length;
  }
}

/**
 * Validates a concurrency capacity before work is scheduled.
 * @param value - The capacity to validate.
 * @param label - Human-readable name used in the failure message.
 * @throws {RangeError} When the capacity is not a positive integer.
 */
function assertPositiveInteger(value: number, label: string): void {
  if (!Number.isInteger(value) || value <= 0) {
    throw new RangeError(`${label} must be a positive integer`);
  }
}

/**
 * Processes items concurrently with a specified limit.
 * @param items Array of items to process.
 * @param concurrencyLimit Maximum number of concurrent operations.
 * @param processor Function to process each item.
 * @returns Promise that resolves to array of results.
 */
export async function processConcurrently<T, R>(
  items: readonly T[],
  concurrencyLimit: number,
  processor: (item: T) => Promise<R>,
): Promise<R[]> {
  assertPositiveInteger(concurrencyLimit, 'Concurrency limit');
  const workerCount = Math.min(items.length, concurrencyLimit);
  const results = new Array<R>(items.length);

  /**
   * Processes one fixed lane of input indexes.
   * @param workerIndex - First input index assigned to this worker lane.
   * @returns Promise that resolves when the lane is complete.
   */
  const processWorkerLane = async (workerIndex: number): Promise<void> => {
    for (let itemIndex = workerIndex; itemIndex < items.length; itemIndex += workerCount) {
      results[itemIndex] = await processor(items[itemIndex]);
    }
  };

  await Promise.all(Array.from({ length: workerCount }, (_, index) => processWorkerLane(index)));
  return results;
}
