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
