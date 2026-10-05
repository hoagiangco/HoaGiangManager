import assert from 'node:assert/strict';
import test from 'node:test';
import { getLoginSecurityConfig } from '../lib/auth/loginSecurity.ts';

test('login security uses safe defaults', () => {
  const previousAttempts = process.env.LOGIN_MAX_FAILED_ATTEMPTS;
  const previousMinutes = process.env.LOGIN_LOCKOUT_MINUTES;
  delete process.env.LOGIN_MAX_FAILED_ATTEMPTS;
  delete process.env.LOGIN_LOCKOUT_MINUTES;

  try {
    assert.deepEqual(getLoginSecurityConfig(), {
      maxFailedAttempts: 5,
      lockoutMinutes: 15,
    });
  } finally {
    if (previousAttempts === undefined) delete process.env.LOGIN_MAX_FAILED_ATTEMPTS;
    else process.env.LOGIN_MAX_FAILED_ATTEMPTS = previousAttempts;
    if (previousMinutes === undefined) delete process.env.LOGIN_LOCKOUT_MINUTES;
    else process.env.LOGIN_LOCKOUT_MINUTES = previousMinutes;
  }
});

test('login security ignores invalid environment values', () => {
  const previousAttempts = process.env.LOGIN_MAX_FAILED_ATTEMPTS;
  const previousMinutes = process.env.LOGIN_LOCKOUT_MINUTES;
  process.env.LOGIN_MAX_FAILED_ATTEMPTS = '0';
  process.env.LOGIN_LOCKOUT_MINUTES = 'invalid';

  try {
    assert.deepEqual(getLoginSecurityConfig(), {
      maxFailedAttempts: 5,
      lockoutMinutes: 15,
    });
  } finally {
    if (previousAttempts === undefined) delete process.env.LOGIN_MAX_FAILED_ATTEMPTS;
    else process.env.LOGIN_MAX_FAILED_ATTEMPTS = previousAttempts;
    if (previousMinutes === undefined) delete process.env.LOGIN_LOCKOUT_MINUTES;
    else process.env.LOGIN_LOCKOUT_MINUTES = previousMinutes;
  }
});
