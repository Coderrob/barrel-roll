/**
 * Splits a string by the given delimiter, trims whitespace from each fragment,
 * and removes any empty fragments.
 *
 * @param value - The string to split and clean.
 * @param delimiter - The delimiter to split the string by. Defaults to a comma.
 * @returns An array of cleaned string fragments.
 */
export function splitAndClean(value: string, delimiter: string | RegExp = /,/): string[] {
  return value
    .split(delimiter)
    .map((fragment) => fragment.trim())
    .filter((fragment) => fragment.length > 0);
}

/**
 * Returns a new array of strings sorted alphabetically using locale-aware comparison.
 *
 * @param values - Iterable collection of string values to sort.
 * @param locale - Optional locale or locales to use for comparison.
 * @param options - Optional Intl.Collator configuration for fine-grained control.
 * @returns A new array containing the sorted values.
 */
export function sortAlphabetically(
  values: Iterable<string>,
  locale?: string | string[],
  options?: Intl.CollatorOptions,
): string[] {
  const entries = Array.from(values);

  if (entries.length <= 1) {
    return entries;
  }

  if (locale !== undefined || options !== undefined) {
    return entries.sort((a, b) => a.localeCompare(b, locale, options));
  }

  return entries.sort((a, b) => a.localeCompare(b));
}
