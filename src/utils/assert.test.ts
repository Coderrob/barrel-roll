import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  assert as customAssert,
  assertDefined,
  assertEqual,
  assertInstanceOf,
  assertNotEqual,
  assertString,
  assertNumber,
  assertBoolean,
  assertThrows,
  assertDoesNotThrow,
} from './assert.js';

describe('assert utils', () => {
  describe('assert', () => {
    it('should not throw when condition is truthy', () => {
      assert.doesNotThrow(() => customAssert(true));
      assert.doesNotThrow(() => customAssert(1));
      assert.doesNotThrow(() => customAssert('string'));
      assert.doesNotThrow(() => customAssert({}));
      assert.doesNotThrow(() => customAssert([]));
    });

    it('should throw TypeError when condition is falsy', () => {
      assert.throws(() => customAssert(false), TypeError);
      assert.throws(() => customAssert(0), TypeError);
      assert.throws(() => customAssert(''), TypeError);
      assert.throws(() => customAssert(null), TypeError);
      assert.throws(() => customAssert(undefined), TypeError);
    });

    it('should throw with custom message', () => {
      assert.throws(() => customAssert(false, 'custom message'), {
        name: 'TypeError',
        message: 'custom message',
      });
    });
  });

  describe('assertEqual', () => {
    it('should not throw when values are equal', () => {
      assert.doesNotThrow(() => assertEqual(1, 1));
      assert.doesNotThrow(() => assertEqual('a', 'a'));
      assert.doesNotThrow(() => assertEqual(true, true));
      assert.doesNotThrow(() => assertEqual(null, null));
      assert.doesNotThrow(() => assertEqual(undefined, undefined));
      // Note: {} !== {} so this would throw - removed
    });

    it('should throw TypeError when values are not equal', () => {
      assert.throws(() => assertEqual(1, 2), TypeError);
      assert.throws(() => assertEqual('a', 'b'), TypeError);
      assert.throws(() => assertEqual(true, false), TypeError);
    });

    it('should throw with custom message', () => {
      assert.throws(() => assertEqual(1, 2, 'custom message'), {
        name: 'TypeError',
        message: 'custom message',
      });
    });
  });

  describe('assertNotEqual', () => {
    it('should not throw when values are not equal', () => {
      assert.doesNotThrow(() => assertNotEqual(1, 2));
      assert.doesNotThrow(() => assertNotEqual('a', 'b'));
      assert.doesNotThrow(() => assertNotEqual(true, false));
    });

    it('should throw TypeError when values are equal', () => {
      assert.throws(() => assertNotEqual(1, 1), TypeError);
      assert.throws(() => assertNotEqual('a', 'a'), TypeError);
      assert.throws(() => assertNotEqual(true, true), TypeError);
      assert.throws(() => assertNotEqual(null, null), TypeError);
    });

    it('should throw with custom message', () => {
      assert.throws(() => assertNotEqual(1, 1, 'custom message'), {
        name: 'TypeError',
        message: 'custom message',
      });
    });
  });

  describe('assertDefined', () => {
    it('should not throw when value is defined', () => {
      assert.doesNotThrow(() => assertDefined(1));
      assert.doesNotThrow(() => assertDefined('string'));
      assert.doesNotThrow(() => assertDefined(true));
      assert.doesNotThrow(() => assertDefined({}));
      assert.doesNotThrow(() => assertDefined([]));
    });

    it('should throw TypeError when value is null or undefined', () => {
      assert.throws(() => assertDefined(null), TypeError);
      assert.throws(() => assertDefined(undefined), TypeError);
    });

    it('should throw with custom message', () => {
      assert.throws(() => assertDefined(null, 'custom message'), {
        name: 'TypeError',
        message: 'custom message',
      });
    });
  });

  describe('assertInstanceOf', () => {
    it('should not throw when value is instance of constructor', () => {
      assert.doesNotThrow(() => assertInstanceOf(new Error('test'), Error));
      assert.doesNotThrow(() => assertInstanceOf(new Date(), Date));
      assert.doesNotThrow(() => assertInstanceOf([], Array));
      assert.doesNotThrow(() => assertInstanceOf({}, Object));
    });

    it('should throw TypeError when value is not instance of constructor', () => {
      assert.throws(() => assertInstanceOf(1, Error), TypeError);
      assert.throws(() => assertInstanceOf('string', Date), TypeError);
      assert.throws(() => assertInstanceOf({}, Array), TypeError);
    });

    it('should throw with custom message', () => {
      assert.throws(() => assertInstanceOf(1, Error, 'custom message'), {
        name: 'TypeError',
        message: 'custom message',
      });
    });
  });

  describe('assertString', () => {
    it('should not throw when value is a string', () => {
      assert.doesNotThrow(() => assertString('hello'));
      assert.doesNotThrow(() => assertString(''));
      assert.doesNotThrow(() => assertString(`template`));
    });

    it('should throw TypeError when value is not a string', () => {
      assert.throws(() => assertString(1), TypeError);
      assert.throws(() => assertString(true), TypeError);
      assert.throws(() => assertString(null), TypeError);
      assert.throws(() => assertString(undefined), TypeError);
      assert.throws(() => assertString({}), TypeError);
      assert.throws(() => assertString([]), TypeError);
    });

    it('should throw with custom message', () => {
      assert.throws(() => assertString(1, 'custom message'), {
        name: 'TypeError',
        message: 'custom message',
      });
    });
  });

  describe('assertNumber', () => {
    it('should not throw when value is a number', () => {
      assert.doesNotThrow(() => assertNumber(1));
      assert.doesNotThrow(() => assertNumber(0));
      assert.doesNotThrow(() => assertNumber(-1));
      assert.doesNotThrow(() => assertNumber(3.14));
      assert.doesNotThrow(() => assertNumber(Number.NaN));
      assert.doesNotThrow(() => assertNumber(Infinity));
    });

    it('should throw TypeError when value is not a number', () => {
      assert.throws(() => assertNumber('1'), TypeError);
      assert.throws(() => assertNumber(true), TypeError);
      assert.throws(() => assertNumber(null), TypeError);
      assert.throws(() => assertNumber(undefined), TypeError);
      assert.throws(() => assertNumber({}), TypeError);
      assert.throws(() => assertNumber([]), TypeError);
    });

    it('should throw with custom message', () => {
      assert.throws(() => assertNumber('1', 'custom message'), {
        name: 'TypeError',
        message: 'custom message',
      });
    });
  });

  describe('assertBoolean', () => {
    it('should not throw when value is a boolean', () => {
      assert.doesNotThrow(() => assertBoolean(true));
      assert.doesNotThrow(() => assertBoolean(false));
    });

    it('should throw TypeError when value is not a boolean', () => {
      assert.throws(() => assertBoolean(1), TypeError);
      assert.throws(() => assertBoolean('true'), TypeError);
      assert.throws(() => assertBoolean(null), TypeError);
      assert.throws(() => assertBoolean(undefined), TypeError);
      assert.throws(() => assertBoolean({}), TypeError);
      assert.throws(() => assertBoolean([]), TypeError);
    });

    it('should throw with custom message', () => {
      assert.throws(() => assertBoolean(1, 'custom message'), {
        name: 'TypeError',
        message: 'custom message',
      });
    });
  });

  describe('assertThrows', () => {
    it('should not throw when function throws any error', () => {
      assert.doesNotThrow(() =>
        assertThrows(() => {
          throw new Error('test');
        }),
      );
      assert.doesNotThrow(() =>
        assertThrows(() => {
          throw new TypeError('test');
        }),
      );
    });

    it('should throw TypeError when function does not throw', () => {
      assert.throws(() => assertThrows(() => {}), TypeError);
      assert.throws(() => assertThrows(() => 1 + 1), TypeError);
    });

    it('should not throw when function throws expected error type', () => {
      assert.doesNotThrow(() =>
        assertThrows(() => {
          throw new TypeError('test');
        }, TypeError),
      );
      assert.doesNotThrow(() =>
        assertThrows(() => {
          throw new Error('test');
        }, Error),
      );
    });

    it('should throw TypeError when function throws wrong error type', () => {
      assert.throws(
        () =>
          assertThrows(() => {
            throw new Error('test');
          }, TypeError),
        TypeError,
      );
      assert.throws(
        () =>
          assertThrows(() => {
            throw new TypeError('test');
          }, RangeError),
        TypeError,
      );
    });

    it('should not throw when error message contains expected string', () => {
      assert.doesNotThrow(() =>
        assertThrows(() => {
          throw new Error('test message');
        }, 'test'),
      );
      assert.doesNotThrow(() =>
        assertThrows(() => {
          throw new Error('error occurred');
        }, 'occurred'),
      );
    });

    it('should throw TypeError when error message does not contain expected string', () => {
      assert.throws(
        () =>
          assertThrows(() => {
            throw new Error('wrong message');
          }, 'expected'),
        TypeError,
      );
    });

    it('should throw with custom message', () => {
      assert.throws(() => assertThrows(() => {}, undefined, 'custom message'), {
        name: 'TypeError',
        message: 'custom message',
      });
    });
  });

  describe('assertDoesNotThrow', () => {
    it('should not throw when function does not throw', () => {
      assert.doesNotThrow(() => assertDoesNotThrow(() => {}));
      assert.doesNotThrow(() => assertDoesNotThrow(() => 1 + 1));
      assert.doesNotThrow(() => assertDoesNotThrow(() => 'string'));
    });

    it('should throw TypeError when function throws', () => {
      assert.throws(
        () =>
          assertDoesNotThrow(() => {
            throw new Error('test error');
          }),
        TypeError,
      );
    });

    it('should throw with custom message', () => {
      assert.throws(
        () =>
          assertDoesNotThrow(() => {
            throw new Error('test error');
          }, 'custom message'),
        {
          name: 'TypeError',
          message: 'custom message',
        },
      );
    });
  });
});
