import assert from 'node:assert/strict';
import test from 'node:test';
import { getDatabaseSslConfig } from '../lib/db/ssl.ts';

test('database SSL defaults to certificate verification for remote production databases', () => {
  assert.deepEqual(
    getDatabaseSslConfig({
      nodeEnv: 'production',
      databaseUrl: 'postgresql://db.example.com/app',
    }),
    { rejectUnauthorized: true }
  );
});

test('database SSL is disabled by default for local databases', () => {
  assert.equal(
    getDatabaseSslConfig({
      nodeEnv: 'production',
      databaseUrl: 'postgresql://localhost/app',
    }),
    false
  );
});

test('database SSL supports an explicit CA certificate', () => {
  assert.deepEqual(
    getDatabaseSslConfig({
      nodeEnv: 'production',
      databaseUrl: 'postgresql://db.example.com/app',
      sslMode: 'verify-full',
      sslCa: 'line-one\\nline-two',
    }),
    { rejectUnauthorized: true, ca: 'line-one\nline-two' }
  );
});

test('database SSL rejects unsupported modes', () => {
  assert.throws(
    () => getDatabaseSslConfig({ sslMode: 'prefer' }),
    /Unsupported DATABASE_SSL_MODE/
  );
});
