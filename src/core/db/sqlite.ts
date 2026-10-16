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
      finalUrl.includes('local.db') ||
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
    const targetDb = '/tmp/data/local.db';

    // Check possible locations for bundled database
    const candidates = [
      path.join(process.cwd(), 'data', 'local.db'),
      path.join(
        process.cwd(),
        '.vercel',
        'output',
        'functions',
        '__server.func',
        'data',
        'local.db'
      ),
      path.resolve('data', 'local.db'),
      '/var/task/data/local.db',
    ];

    let foundBundled: string | null = null;
    for (const c of candidates) {
      if (fs.existsSync(c)) {
        foundBundled = c;
        break;
      }
    }

    if (foundBundled && !fs.existsSync(targetDb)) {
      try {
        fs.copyFileSync(foundBundled, targetDb);
      } catch (e) {
        console.error('[db] failed to copy local.db to /tmp:', e);
      }
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

  // Ensure tables exist on Vercel ephemeral storage
  if (process.env.VERCEL) {
    try {
      const { INIT_SQL } = require('./init-sql');
      const statements = INIT_SQL.split(';')
        .map((s: string) => s.trim())
        .filter((s: string) => s.length > 0);
      for (const stmt of statements) {
        client.execute(stmt).catch(() => {});
      }
    } catch (e) {
      console.error('[db] failed to run init sql:', e);
    }
  }

  return drizzle({ client });
}
