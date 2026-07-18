import 'dotenv/config';
import { prisma } from '../src/lib/prisma';
import bcrypt from 'bcryptjs';

async function main() {
  const name = 'Palle Viswanath Reddy';
  const email = 'palleviswanathreddy11@gmail.com';
  const password = 'Admin@123';

  console.log('Hashing password...');
  const passwordHash = await bcrypt.hash(password, 10);

  console.log(`Upserting admin user: ${email}...`);
  const admin = await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      name,
      passwordHash,
      role: 'admin',
      emailVerified: true,
    },
  });

  console.log('Admin user upserted successfully:');
  console.log(`- ID: ${admin.id}`);
  console.log(`- Name: ${admin.name}`);
  console.log(`- Email: ${admin.email}`);
  console.log(`- Role: ${admin.role}`);
  console.log(`- Email Verified: ${admin.emailVerified}`);
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error creating admin user:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
