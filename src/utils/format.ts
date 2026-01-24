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
