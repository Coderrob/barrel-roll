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
   */
  constructor(private permits: number) {}

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

    return new Promise((resolve) => {
      this.waiting.push(resolve);
    });
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

    const resolve = this.waiting.shift()!;
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
 * Processes items concurrently with a specified limit.
 * @param items Array of items to process.
 * @param concurrencyLimit Maximum number of concurrent operations.
 * @param processor Function to process each item.
 * @returns Promise that resolves to array of results.
 */
export async function processConcurrently<T, R>(
  items: T[],
  concurrencyLimit: number,
  processor: (item: T) => Promise<R>,
): Promise<R[]> {
  const semaphore = new Semaphore(concurrencyLimit);

  const promises = items.map(async (item) => {
    await semaphore.acquire();
    try {
      return await processor(item);
    } finally {
      semaphore.release();
    }
  });

  return Promise.all(promises);
}
