import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { isObject, isString, isError } from './guards.js';

describe('guards utils', () => {
  describe('isObject', () => {
    it('should return true for plain objects', () => {
      assert.equal(isObject({}), true);
      assert.equal(isObject({ key: 'value' }), true);
    });

    it('should return true for object instances', () => {
      assert.equal(isObject(new Object()), true);
    });

    void it('should return false for null', () => {
      assert.equal(isObject(null), false);
    });

    it('should return false for undefined', () => {
      assert.equal(isObject(undefined), false);
    });

    it('should return false for primitives', () => {
      assert.equal(isObject(42), false);
      assert.equal(isObject('string'), false);
      assert.equal(isObject(true), false);
    });

    it('should return true for arrays (as they are objects)', () => {
      assert.equal(isObject([]), true);
      assert.equal(isObject([1, 2, 3]), true);
    });

    it('should return false for functions', () => {
      assert.equal(
        isObject(() => {}),
        false,
      );
    });
  });

  describe('isString', () => {
    it('should return true for string primitives', () => {
      assert.equal(isString('hello'), true);
      assert.equal(isString(''), true);
      assert.equal(isString(`template`), true);
    });

    it('should return false for String coercions', () => {
      const boxedString = Reflect.construct(String, ['hello']);
      assert.equal(isString(boxedString), false);
    });

    it('should return false for null', () => {
      assert.equal(isString(null), false);
    });

    it('should return false for undefined', () => {
      assert.equal(isString(undefined), false);
    });

    it('should return false for other primitives', () => {
      assert.equal(isString(42), false);
      assert.equal(isString(true), false);
    });

    it('should return false for objects', () => {
      assert.equal(isString({}), false);
      assert.equal(isString([]), false);
    });
  });

  describe('isError', () => {
    it('should return true for Error instances', () => {
      assert.equal(isError(new Error('oops')), true);
      assert.equal(isError(new TypeError('bad')), true);
    });

    it('should return true for objects with a message string', () => {
      assert.equal(isError({ message: 'some' }), true);
    });

    it('should return false for objects without message', () => {
      assert.equal(isError({}), false);
      assert.equal(isError({ message: 123 }), false);
    });

    it('should return false for primitives and null/undefined', () => {
      assert.equal(isError(null), false);
      assert.equal(isError(undefined), false);
      assert.equal(isError('error'), false);
    });
  });
});
