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
 * Returns true when the provided value is a non-null object.
 * @param value The value to check
 * @returns True when the value is a non-null object; otherwise false.
 */
export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/**
 * Returns true when the provided value is a string primitive.
 * @param value The value to check
 * @returns True when the value is a string; otherwise false.
 */
export function isString(value: unknown): value is string {
  return typeof value === 'string';
}

/**
 * Returns true if the value looks like an Error (has a message string or is an Error instance).
 * @param value The value to check
 */
export function isError(value: unknown): value is Error {
  return (
    value instanceof Error ||
    (isObject(value) && 'message' in value && isString((value as any).message))
  );
}
