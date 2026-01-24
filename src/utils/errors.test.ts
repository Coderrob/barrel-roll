import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getErrorMessage, formatErrorForLog } from './errors.js';

describe('error utils', () => {
  describe('getErrorMessage', () => {
    it('should extract message from Error instances', () => {
      assert.equal(getErrorMessage(new Error('oops')), 'oops');
    });

    it('should extract message from objects with message property', () => {
      assert.equal(getErrorMessage({ message: 'some' }), 'some');
    });

    it('should convert primitives to string', () => {
      assert.equal(getErrorMessage('x'), 'x');
      assert.equal(getErrorMessage(123), '123');
    });

    it('should stringify undefined/null consistently', () => {
      assert.equal(getErrorMessage(undefined), 'undefined');
      assert.equal(getErrorMessage(null), 'null');
    });
  });

  describe('formatErrorForLog', () => {
    it('should prefer stack when available', () => {
      const err = new Error('boom');
      err.stack = 'STACK';
      assert.equal(formatErrorForLog(err), 'STACK');
    });

    it('should stringify object via safeStringify', () => {
      const obj = { a: 1 };
      assert.ok(formatErrorForLog(obj).includes('a'));
    });

    it('should fallback to string conversion for primitives', () => {
      assert.equal(formatErrorForLog('x'), 'x');
    });
  });
});
