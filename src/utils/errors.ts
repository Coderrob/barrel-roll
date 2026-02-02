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

import { safeStringify } from './format.js';
import { isError, isObject } from './guards.js';

/**
 * Extracts a message from an unknown thrown value in a safe, predictable way.
 * @param value The thrown value
 * @returns The extracted message string
 */
export function getErrorMessage(value: unknown): string {
  return isError(value) ? value.message : String(value);
}

/**
 * Formats an error for logging. If an Error instance, uses stack or message.
 * If an object, uses JSON safe stringification. Otherwise, falls back to getErrorMessage.
 */
export function formatErrorForLog(error: unknown): string {
  if (isError(error)) return error.stack || error.message;
  if (isObject(error)) return safeStringify(error);
  return getErrorMessage(error);
}
