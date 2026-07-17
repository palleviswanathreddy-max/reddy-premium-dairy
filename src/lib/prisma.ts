import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

// Global singleton to survive Next.js hot reloads in dev
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  pgPool: Pool | undefined;
};

function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      '[Prisma] DATABASE_URL is not set. ' +
      'Make sure .env or .env.local contains DATABASE_URL and that `npx prisma dev` is running.'
    );
  }

  // Reuse the pool if it already exists (singleton)
  if (!globalForPrisma.pgPool) {
    globalForPrisma.pgPool = new Pool({
      connectionString,
      // Sensible defaults that work with Prisma's local proxy
      max: 10,
      connectionTimeoutMillis: 5000,
      idleTimeoutMillis: 30000,
    });

    // Handle pool errors gracefully to prevent unhandled rejections
    globalForPrisma.pgPool.on('error', (err) => {
      console.error('[PG Pool Error]', err.message);
    });
  }

  const adapter = new PrismaPg(globalForPrisma.pgPool);

  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });
}

export const prisma: PrismaClient =
  globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
