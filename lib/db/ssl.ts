import type { ConnectionOptions } from 'tls';

export type DatabaseSslMode = 'disable' | 'require' | 'verify-full';

interface DatabaseSslEnvironment {
  nodeEnv?: string;
  databaseUrl?: string;
  sslMode?: string;
  sslCa?: string;
}

export function getDatabaseSslConfig(
  environment: DatabaseSslEnvironment = {
    nodeEnv: process.env.NODE_ENV,
    databaseUrl: process.env.DATABASE_URL,
    sslMode: process.env.DATABASE_SSL_MODE,
    sslCa: process.env.DATABASE_SSL_CA,
  }
): false | ConnectionOptions {
  const isLocalhost =
    environment.databaseUrl?.includes('localhost') ||
    environment.databaseUrl?.includes('127.0.0.1');
  const defaultMode: DatabaseSslMode =
    environment.nodeEnv === 'production' && !isLocalhost ? 'verify-full' : 'disable';
  const mode = (environment.sslMode?.trim().toLowerCase() || defaultMode) as DatabaseSslMode;

  if (mode === 'disable') return false;
  if (mode === 'require') return { rejectUnauthorized: false };
  if (mode === 'verify-full') {
    const ca = environment.sslCa?.replace(/\\n/g, '\n').trim();
    return ca ? { rejectUnauthorized: true, ca } : { rejectUnauthorized: true };
  }

  throw new Error(
    `Unsupported DATABASE_SSL_MODE "${environment.sslMode}". Use disable, require, or verify-full.`
  );
}
