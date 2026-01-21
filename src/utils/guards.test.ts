import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { isObject, isString } from './guards';

void describe('isObject', () => {
  void it('should return true for plain objects', () => {
    assert.equal(isObject({}), true);
    assert.equal(isObject({ key: 'value' }), true);
  });

  void it('should return true for object instances', () => {
    assert.equal(isObject(new Object()), true);
  });

  void it('should return false for null', () => {
    assert.equal(isObject(null), false);
  });

  void it('should return false for undefined', () => {
    assert.equal(isObject(undefined), false);
  });

  void it('should return false for primitives', () => {
    assert.equal(isObject(42), false);
    assert.equal(isObject('string'), false);
    assert.equal(isObject(true), false);
  });

  void it('should return true for arrays (as they are objects)', () => {
    assert.equal(isObject([]), true);
    assert.equal(isObject([1, 2, 3]), true);
  });

  void it('should return false for functions', () => {
    assert.equal(
      isObject(() => {}),
      false,
    );
  });
});

void describe('isString', () => {
  void it('should return true for string primitives', () => {
    assert.equal(isString('hello'), true);
    assert.equal(isString(''), true);
    assert.equal(isString(`template`), true);
  });

  void it('should return false for String coercions', () => {
    const boxedString = Reflect.construct(String, ['hello']);
    assert.equal(isString(boxedString), false);
  });

  void it('should return false for null', () => {
    assert.equal(isString(null), false);
  });

  void it('should return false for undefined', () => {
    assert.equal(isString(undefined), false);
  });

  void it('should return false for other primitives', () => {
    assert.equal(isString(42), false);
    assert.equal(isString(true), false);
  });

  void it('should return false for objects', () => {
    assert.equal(isString({}), false);
    assert.equal(isString([]), false);
  });
});
