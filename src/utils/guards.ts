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
