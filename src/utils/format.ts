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

import { isString } from './guards.js';

/**
 * Safely stringify a value for logging/serialization.
 * Returns the original string if provided, otherwise attempts JSON.stringify and falls back to String(value) on failure.
 */
export function safeStringify(value: unknown): string {
  if (isString(value)) return value;

  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}
