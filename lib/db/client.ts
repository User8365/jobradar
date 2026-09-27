import { resolve } from 'node:path';
import { config as loadEnv } from 'dotenv';
import { neon } from '@neondatabase/serverless';

loadEnv({ path: resolve(process.cwd(), '.env.local') });
loadEnv({ path: resolve(process.cwd(), '.env') });

export function getDb() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error('DATABASE_URL is not configured');
  }

  return neon(connectionString);
}
