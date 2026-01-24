/**
 * Assertion utilities for runtime checks and validation.
 */

import { getErrorMessage } from './errors.js';
import { isString } from './guards.js';

/**
 * Asserts that a condition is truthy. Throws an Error with the provided message if not.
 * @param condition The condition to check
 * @param message The error message to throw if condition is falsy
 */
export function assert(condition: unknown, message?: string): asserts condition {
  if (!condition) {
    throw new TypeError(message ?? 'Assertion failed');
  }
}

/**
 * Asserts that two values are equal using strict equality (===).
 * @param actual The actual value
 * @param expected The expected value
 * @param message The error message to throw if values are not equal
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
 * Asserts that two values are not equal using strict equality (!==).
 * @param actual The actual value
 * @param unexpected The unexpected value
 * @param message The error message to throw if values are equal
 */
export function assertNotEqual<T>(actual: T, unexpected: T, message?: string): void {
  if (actual === unexpected) {
    throw new TypeError(
      message ?? `Assertion failed: expected not ${unexpected}, but got ${actual}`,
    );
  }
}

/**
 * Asserts that a value is not null or undefined.
 * @param value The value to check
 * @param message The error message to throw if value is null or undefined
 */
export function assertDefined<T>(value: T, message?: string): asserts value is NonNullable<T> {
  if (value == null) {
    throw new TypeError(message ?? `Assertion failed: value is null or undefined`);
  }
}

/**
 * Asserts that a value is an instance of the specified constructor.
 * @param value The value to check
 * @param constructor The constructor to check against
 * @param message The error message to throw if value is not an instance
 */
export function assertInstanceOf<T>(
  value: unknown,
  constructor: new (...args: any[]) => T,
  message?: string,
): asserts value is T {
  if (!(value instanceof constructor)) {
    throw new TypeError(message || 'Instance type assertion failed');
  }
}

/**
 * Asserts that a function throws an error.
 * @param fn The function to call
 * @param expectedError Optional error constructor or error message to match
 * @param message The error message to throw if function doesn't throw
 */
export function assertThrows(
  fn: () => void,
  expectedError?: (new (...args: any[]) => Error) | string,
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
 * Validates that a thrown error matches the expected error type or message.
 * @param error - The error that was thrown.
 * @param expectedError - The expected error constructor or message.
 */
function validateThrownError(
  error: unknown,
  expectedError?: (new (...args: any[]) => Error) | string,
): void {
  if (!expectedError) {
    return; // Any error is fine
  }

  if (isString(expectedError)) {
    checkErrorMessage(error, expectedError);
    return;
  }

  checkErrorType(error, expectedError);
}

/**
 * Checks that an error message contains the expected substring.
 * @param error - The error to check.
 * @param expectedMessage - The expected message substring.
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
 * Checks that an error is an instance of the expected constructor.
 * @param error - The error to check.
 * @param expectedConstructor - The expected error constructor.
 */
function checkErrorType(error: unknown, expectedConstructor: new (...args: any[]) => Error): void {
  if (!(error instanceof expectedConstructor)) {
    throw new TypeError(
      `Assertion failed: expected error of type ${expectedConstructor.name}, but got ${error?.constructor?.name ?? typeof error}`,
    );
  }
}

/**
 * Asserts that a function does not throw an error.
 * @param fn The function to call
 * @param message The error message to throw if function throws
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
 * Asserts that a value is a string.
 * @param value The value to check
 * @param message The error message to throw if value is not a string
 */
export function assertString(value: unknown, message?: string): asserts value is string {
  if (typeof value !== 'string') {
    throw new TypeError(message ?? `Assertion failed: expected string, but got ${typeof value}`);
  }
}

/**
 * Asserts that a value is a number.
 * @param value The value to check
 * @param message The error message to throw if value is not a number
 */
export function assertNumber(value: unknown, message?: string): asserts value is number {
  if (typeof value !== 'number') {
    throw new TypeError(message ?? `Assertion failed: expected number, but got ${typeof value}`);
  }
}

/**
 * Asserts that a value is a boolean.
 * @param value The value to check
 * @param message The error message to throw if value is not a boolean
 */
export function assertBoolean(value: unknown, message?: string): asserts value is boolean {
  if (typeof value !== 'boolean') {
    throw new TypeError(message ?? `Assertion failed: expected boolean, but got ${typeof value}`);
  }
}
