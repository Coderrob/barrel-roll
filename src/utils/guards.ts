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
