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
