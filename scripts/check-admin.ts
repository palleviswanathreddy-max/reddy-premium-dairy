import 'dotenv/config';
import { prisma } from '../src/lib/prisma';

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  let host = 'N/A';
  let maskedUrl = 'N/A';

  if (databaseUrl) {
    try {
      const url = new URL(databaseUrl);
      host = url.host;
      maskedUrl = `${url.protocol}//****:****@${url.host}${url.pathname}${url.search}`;
    } catch {
      const match = databaseUrl.match(/@([^/]+)/);
      if (match) {
        host = match[1];
      }
      maskedUrl = '[Could not parse URL but extracted host]';
    }
  }

  console.log(`DATABASE_URL host: ${host}`);
  console.log(`DATABASE_URL (masked): ${maskedUrl}`);

  try {
    const totalUsers = await prisma.user.count();
    console.log(`Total number of users in the database: ${totalUsers}`);

    const email = 'palleviswanathreddy11@gmail.com';
    const adminUser = await prisma.user.findUnique({
      where: { email },
    });

    if (adminUser) {
      console.log('Admin user found in database:', JSON.stringify(adminUser, null, 2));
    } else {
      console.log(`User not found: "${email}" does not exist in this database.`);
    }
  } catch (error) {
    console.error('Error querying database:', error instanceof Error ? error.message : error);
  }
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error running check-admin:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
