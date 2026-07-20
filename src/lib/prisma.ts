import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  pgPool?: Pool;
};

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    '[Prisma] DATABASE_URL is not set. ' +
    'Make sure .env or .env.local contains DATABASE_URL.'
  );
}

// ────────────────────────────────────────────────────────────
// Connection Pool Singleton
// Neon Cloud PostgreSQL uses its own cloud PgBouncer pooler (-pooler hostname).
// Setting idleTimeoutMillis: 0 prevents client-side socket teardown that caused
// intermittent P1001 DatabaseNotReachable errors in development.
// ────────────────────────────────────────────────────────────
if (!globalForPrisma.pgPool) {
  globalForPrisma.pgPool = new Pool({
    connectionString,
    max: 10,
    idleTimeoutMillis: 0, // Keep pool connections alive; prevent idle drop P1001 errors
    connectionTimeoutMillis: 15000,
    ssl: {
      rejectUnauthorized: false,
    },
  });

  globalForPrisma.pgPool.on('error', (err) => {
    console.warn('[Prisma PG Pool Warning]', err.message);
  });
}

if (!globalForPrisma.prisma) {
  const adapter = new PrismaPg(globalForPrisma.pgPool);
  globalForPrisma.prisma = new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });
}

export const prisma: PrismaClient = globalForPrisma.prisma;

// Persist singleton on globalThis in non-production environments (Next.js HMR / Turbopack)
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
  globalForPrisma.pgPool = globalForPrisma.pgPool;
}
