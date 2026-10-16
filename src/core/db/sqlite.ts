import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';

import type { DbConfig } from './types';

const isCloudflareWorker =
  typeof globalThis !== 'undefined' && 'Cloudflare' in globalThis;

// SQLite/libsql singleton
let sqliteDbInstance: ReturnType<typeof drizzle> | null = null;

export function createSqliteDb(config: DbConfig) {
  const databaseUrl = config.database_url;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is not set');
  }

  // If databaseUrl is a local relative file path (like file:data/local.db or data/local.db)
  // in serverless environments (e.g. Vercel Lambda /var/task), resolve to writable /tmp
  let finalUrl = databaseUrl;
  if (
    process.env.VERCEL &&
    (finalUrl.startsWith('file:data/') ||
      finalUrl.startsWith('data/') ||
      finalUrl === 'file:data/local.db')
  ) {
    const fs = require('fs');
    const path = require('path');
    const tmpDir = '/tmp/data';
    if (!fs.existsSync(tmpDir)) {
      try {
        fs.mkdirSync(tmpDir, { recursive: true });
      } catch {}
    }
    const bundledDb = path.join(process.cwd(), 'data/local.db');
    const targetDb = '/tmp/data/local.db';
    if (fs.existsSync(bundledDb) && !fs.existsSync(targetDb)) {
      try {
        fs.copyFileSync(bundledDb, targetDb);
      } catch {}
    }
    finalUrl = 'file:' + targetDb;
  }

  const options: Record<string, string> = {};
  if (config.database_auth_token) {
    options.authToken = config.database_auth_token;
  }

  // In Cloudflare Workers, create new connection each time
  if (isCloudflareWorker) {
    const client = createClient({
      url: finalUrl,
      ...options,
    });
    return drizzle({ client });
  }

  // Singleton mode: reuse existing instance
  if (config.db_singleton_enabled === 'true') {
    if (sqliteDbInstance) return sqliteDbInstance;

    const client = createClient({
      url: finalUrl,
      ...options,
    });
    sqliteDbInstance = drizzle({ client });
    return sqliteDbInstance;
  }

  // Non-singleton mode: create new connection each time
  const client = createClient({
    url: finalUrl,
    ...options,
  });
  return drizzle({ client });
}
