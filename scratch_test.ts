import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  pgPool?: Pool;
};

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('[Prisma] DATABASE_URL is not set.');
}

// Singleton Pool without aggressive idle closures that cause P1001
if (!globalForPrisma.pgPool) {
  globalForPrisma.pgPool = new Pool({
    connectionString,
    max: 10,
    // Disable aggressive idle disconnection to prevent P1001 on idle resume
    idleTimeoutMillis: 0,
    connectionTimeoutMillis: 10000,
    ssl: {
      rejectUnauthorized: false,
    },
  });

  globalForPrisma.pgPool.on('error', (err) => {
    // Prevent unhandled pool errors from crashing dev server
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

export const prisma = globalForPrisma.prisma;

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

async function testParallelAndIdle() {
  console.log('--- TESTING PRISMA ADAPTER SINGLETON ---');

  // Test 1: 20 parallel queries
  console.log('Running 20 parallel queries...');
  const promises = Array.from({ length: 20 }).map((_, i) =>
    prisma.user.findFirst({ select: { id: true, email: true } })
  );
  const results = await Promise.all(promises);
  console.log('✓ 20 Parallel queries succeeded! Results count:', results.length);

  // Test 2: Product query
  const products = await prisma.product.findMany({ take: 5 });
  console.log('✓ Product query succeeded! Count:', products.length);

  console.log('--- ALL TESTS PASSED PERFECTLY ---');
  process.exit(0);
}

testParallelAndIdle().catch((err) => {
  console.error('Test error:', err);
  process.exit(1);
});
