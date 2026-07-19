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
      // Optimized connection pool settings for serverless environment & Neon
      max: 3,
      connectionTimeoutMillis: 35000,
      idleTimeoutMillis: 30000,
      ssl: {
        rejectUnauthorized: false,
      },
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

// Keep database client persistent globally in both dev and production to prevent connection leaks
globalForPrisma.prisma = prisma;
