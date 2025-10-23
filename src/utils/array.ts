/**
 * Determines whether the provided array is either missing or contains no elements.
 *
 * @param value - The array-like value to inspect.
 * @returns True when the input is `null`, `undefined`, or has a length of zero; otherwise false.
 */
export function isEmptyArray<T>(value: readonly T[] | null | undefined): boolean {
  return !value || value.length === 0;
}
