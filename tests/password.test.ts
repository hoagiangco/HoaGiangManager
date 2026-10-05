import assert from 'node:assert/strict';
import test from 'node:test';
import { getDefaultStaffPassword, validatePassword } from '../lib/auth/password.ts';

test('reads the configured default password for staff accounts', () => {
  const originalPassword = process.env.DEFAULT_STAFF_PASSWORD;
  process.env.DEFAULT_STAFF_PASSWORD = '123456';

  try {
    assert.equal(getDefaultStaffPassword(), '123456');
  } finally {
    if (originalPassword === undefined) {
      delete process.env.DEFAULT_STAFF_PASSWORD;
    } else {
      process.env.DEFAULT_STAFF_PASSWORD = originalPassword;
    }
  }
});

test('password policy requires at least six characters', () => {
  assert.match(validatePassword('12345') || '', /6/);
  assert.equal(validatePassword('123456'), null);
  assert.equal(validatePassword('matkhau'), null);
});

test('requires the default password to be configured', () => {
  const originalPassword = process.env.DEFAULT_STAFF_PASSWORD;
  delete process.env.DEFAULT_STAFF_PASSWORD;

  try {
    assert.throws(() => getDefaultStaffPassword(), /DEFAULT_STAFF_PASSWORD/);
  } finally {
    if (originalPassword !== undefined) {
      process.env.DEFAULT_STAFF_PASSWORD = originalPassword;
    }
  }
});
