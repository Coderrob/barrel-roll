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
 * Assertion utilities for runtime checks and validation.
 */

import { getErrorMessage } from './errors.js';
import { isString } from './guards.js';

type Constructor<T> = new (...args: never[]) => T;

/**
 * Narrows a value to its truthy form.
 * @param condition Value whose truthiness is required.
 * @param message Optional failure message.
 * @throws {TypeError} When the condition is falsy.
 */
export function assert(condition: unknown, message?: string): asserts condition {
  if (!condition) {
    throw new TypeError(message ?? 'Assertion failed');
  }
}

/**
 * Narrows a value to boolean.
 * @param value Value whose runtime type is checked.
 * @param message Optional failure message.
 * @throws {TypeError} When the value is not a boolean.
 */
export function assertBoolean(value: unknown, message?: string): asserts value is boolean {
  if (typeof value !== 'boolean') {
    throw new TypeError(message ?? `Assertion failed: expected boolean, but got ${typeof value}`);
  }
}

/**
 * Narrows a value by rejecting null and undefined.
 * @param value Value that must be defined.
 * @param message Optional failure message.
 * @throws {TypeError} When the value is null or undefined.
 */
export function assertDefined<T>(value: T, message?: string): asserts value is NonNullable<T> {
  if (value == null) {
    throw new TypeError(message ?? `Assertion failed: value is null or undefined`);
  }
}

/**
 * Verifies that a synchronous function completes without throwing.
 * @param fn Function to invoke.
 * @param message Optional failure message.
 * @throws {TypeError} When the function throws.
 */
export function assertDoesNotThrow(fn: () => void, message?: string): void {
  try {
    fn();
  } catch (error) {
    throw new TypeError(
      message ??
        `Assertion failed: expected function not to throw, but it threw: ${getErrorMessage(error)}`,
    );
  }
}

/**
 * Verifies strict equality.
 * @param actual Observed value.
 * @param expected Required value.
 * @param message Optional failure message.
 * @throws {TypeError} When the values are not strictly equal.
 */
export function assertEqual<T>(actual: T, expected: T, message?: string): void {
  if (actual !== expected) {
    throw new TypeError(
      message ??
        `Assertion failed: expected ${expected} (${typeof expected}), but got ${actual} (${typeof actual})`,
    );
  }
}

/**
 * Narrows a value to an instance of the provided constructor.
 * @param value Value whose prototype is checked.
 * @param constructor Required constructor.
 * @param message Optional failure message.
 * @throws {TypeError} When the value is not an instance of the constructor.
 */
export function assertInstanceOf<T>(
  value: unknown,
  constructor: Constructor<T>,
  message?: string,
): asserts value is T {
  if (!(value instanceof constructor)) {
    throw new TypeError(message || 'Instance type assertion failed');
  }
}

/**
 * Verifies strict inequality.
 * @param actual Observed value.
 * @param unexpected Disallowed value.
 * @param message Optional failure message.
 * @throws {TypeError} When the values are strictly equal.
 */
export function assertNotEqual<T>(actual: T, unexpected: T, message?: string): void {
  if (actual === unexpected) {
    throw new TypeError(
      message ?? `Assertion failed: expected not ${unexpected}, but got ${actual}`,
    );
  }
}

/**
 * Narrows a value to number.
 * @param value Value whose runtime type is checked.
 * @param message Optional failure message.
 * @throws {TypeError} When the value is not a number.
 */
export function assertNumber(value: unknown, message?: string): asserts value is number {
  if (typeof value !== 'number') {
    throw new TypeError(message ?? `Assertion failed: expected number, but got ${typeof value}`);
  }
}

/**
 * Narrows a value to string.
 * @param value Value whose runtime type is checked.
 * @param message Optional failure message.
 * @throws {TypeError} When the value is not a string.
 */
export function assertString(value: unknown, message?: string): asserts value is string {
  if (typeof value !== 'string') {
    throw new TypeError(message ?? `Assertion failed: expected string, but got ${typeof value}`);
  }
}

/**
 * Verifies that a synchronous function throws, optionally matching its type or message.
 * @param fn Function expected to throw.
 * @param expectedError Optional error constructor or required message substring.
 * @param message Optional message used when the function does not throw.
 * @throws {TypeError} When no error is thrown or the thrown error does not match.
 */
export function assertThrows(
  fn: () => void,
  expectedError?: Constructor<Error> | string,
  message?: string,
): void {
  try {
    fn();
  } catch (error) {
    validateThrownError(error, expectedError);
    return;
  }
  throw new TypeError(message ?? 'Assertion failed: expected function to throw, but it did not');
}

/**
 * Verifies that a thrown value's message contains a substring.
 * @param error Thrown value to inspect.
 * @param expectedMessage Required message substring.
 * @throws {TypeError} When the normalized error message does not contain the substring.
 */
function checkErrorMessage(error: unknown, expectedMessage: string): void {
  const errorMessage = getErrorMessage(error);
  if (!errorMessage.includes(expectedMessage)) {
    throw new TypeError(
      `Assertion failed: expected error message to contain "${expectedMessage}", but got "${errorMessage}"`,
    );
  }
}

/**
 * Verifies that a thrown value has the expected error type.
 * @param error Thrown value to inspect.
 * @param expectedConstructor Required error constructor.
 * @throws {TypeError} When the thrown value is not an instance of the constructor.
 */
function checkErrorType(error: unknown, expectedConstructor: Constructor<Error>): void {
  if (!(error instanceof expectedConstructor)) {
    const errorTypeName = error instanceof Error ? error.name : String(typeof error);
    throw new TypeError(
      `Assertion failed: expected error of type ${expectedConstructor.name}, but got ${errorTypeName}`,
    );
  }
}

/**
 * Applies an optional error type or message contract to a thrown value.
 * @param error Thrown value to validate.
 * @param expectedError Optional error constructor or required message substring.
 * @throws {TypeError} When the thrown value does not satisfy the requested contract.
 */
function validateThrownError(error: unknown, expectedError?: Constructor<Error> | string): void {
  if (!expectedError) {
    return; // Any error is fine
  }

  if (isString(expectedError)) {
    checkErrorMessage(error, expectedError);
    return;
  }

  checkErrorType(error, expectedError);
}
