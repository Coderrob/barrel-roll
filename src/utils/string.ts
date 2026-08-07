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
 * Compares two strings using default locale comparison.
 * @param a - The first string.
 * @param b - The second string.
 * @returns Negative, zero, or positive comparison result.
 */
function compareDefault(a: string, b: string): number {
  return a.localeCompare(b);
}

/**
 * Trims leading and trailing whitespace from a string fragment.
 * @param fragment - The string fragment to trim.
 * @returns The trimmed string.
 */
function isNonEmpty(fragment: string): boolean {
  return fragment.length > 0;
}

/**
 * Returns a sorted copy of the provided strings without mutating the input iterable.
 * @param values Strings to sort.
 * @param locale Optional locale or locale preference list passed to `localeCompare`.
 * @param options Optional locale-aware comparison settings.
 * @returns A new array in deterministic alphabetical order.
 */
export function sortAlphabetically(
  values: Readonly<Iterable<string>>,
  locale?: string | string[],
  options?: Readonly<Intl.CollatorOptions>,
): string[] {
  const entries = Array.from(values);

  if (entries.length <= 1) {
    return entries;
  }

  if (locale === undefined && options === undefined) {
    return sortLocalCopy(entries, compareDefault);
  }

  /**
   * Compares two strings using locale settings.
   * @param a - First string to compare.
   * @param b - Second string to compare.
   * @returns Negative, zero, or positive comparison result.
   */
  const localeCompare = (a: string, b: string): number => a.localeCompare(b, locale, options);
  return sortLocalCopy(entries, localeCompare);
}

/**
 * Sorts an array that is owned exclusively by this module operation.
 * Reflective invocation keeps the ES2022 runtime contract while making the local mutation boundary
 * explicit; callers never expose or retain this array.
 * @param entries Entries to copy and sort.
 * @param compare Comparison function.
 * @returns A sorted copy of the entries.
 */
function sortLocalCopy(
  entries: readonly string[],
  compare: (left: string, right: string) => number,
): string[] {
  const nativeSort: (
    this: string[],
    compareFunction?: (left: string, right: string) => number,
  ) => string[] = Array.prototype.sort;
  return Reflect.apply(nativeSort, Array.from(entries), [compare]);
}

/**
 * Splits a string by the given delimiter, trims whitespace from each fragment,
 * and removes any empty fragments.
 *
 * @param value - The string to split and clean.
 * @param delimiter - The delimiter to split the string by. Defaults to a comma.
 * @returns An array of cleaned string fragments.
 */
export function splitAndClean(value: string, delimiter: string | RegExp = /,/): string[] {
  return value.split(delimiter).map(trimFragment).filter(isNonEmpty);
}

/**
 * Returns a new array of strings sorted alphabetically using locale-aware comparison.
 *
 * @param values - Iterable collection of string values to sort.
 * @param locale - Optional locale or locales to use for comparison.
 * @param options - Optional Intl.Collator configuration for fine-grained control.
 * @returns A new array containing the sorted values.
 */
function trimFragment(fragment: string): string {
  return fragment.trim();
}
