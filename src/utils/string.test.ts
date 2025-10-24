/* eslint-disable @typescript-eslint/no-floating-promises */

import { describe, expect, it } from '../test-utils/testHarness.js';

import { splitAndClean, sortAlphabetically } from './string.js';

describe('splitAndClean', () => {
  it('should split by default comma delimiter, trim, and remove empty fragments', () => {
    expect(splitAndClean('a, b , c')).toEqual(['a', 'b', 'c']);
    expect(splitAndClean('a,,b, ,c')).toEqual(['a', 'b', 'c']);
  });

  it('should split by custom string delimiter', () => {
    expect(splitAndClean('a;b;c', ';')).toEqual(['a', 'b', 'c']);
  });

  it('should split by RegExp delimiter', () => {
    expect(splitAndClean('a1b2c', /\d/)).toEqual(['a', 'b', 'c']);
  });

  it('should handle empty string', () => {
    expect(splitAndClean('')).toEqual([]);
  });

  it('should handle string with only delimiters and spaces', () => {
    expect(splitAndClean(', , ,')).toEqual([]);
  });

  it('should handle no splits needed', () => {
    expect(splitAndClean('abc')).toEqual(['abc']);
  });
});

describe('sortAlphabetically', () => {
  it('should sort strings alphabetically', () => {
    expect(sortAlphabetically(['c', 'a', 'b'])).toEqual(['a', 'b', 'c']);
  });

  it('should handle empty array', () => {
    expect(sortAlphabetically([])).toEqual([]);
  });

  it('should handle single item', () => {
    expect(sortAlphabetically(['a'])).toEqual(['a']);
  });

  it('should sort with locale', () => {
    expect(sortAlphabetically(['ä', 'a'], 'de')).toEqual(['a', 'ä']);
  });

  it('should sort with options', () => {
    expect(sortAlphabetically(['A', 'a'], undefined, { sensitivity: 'base' })).toEqual(['A', 'a']);
  });

  it('should handle iterable input', () => {
    expect(sortAlphabetically(new Set(['c', 'a', 'b']))).toEqual(['a', 'b', 'c']);
  });
});
