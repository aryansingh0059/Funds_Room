import prisma from '../config/prisma';
import { hashPassword } from '../utils/password';
import { Role } from '@prisma/client';

export const SEED_USERS = [
  {
    email: 'admin@fundsroom.com',
    name: 'Chief Admin',
    role: Role.ADMIN,
    passwordPlain: 'Admin@1234',
  },
  {
    email: 'sales@fundsroom.com',
    name: 'Lead Sales Executive',
    role: Role.SALES,
    passwordPlain: 'Sales@1234',
  },
  {
    email: 'warehouse@fundsroom.com',
    name: 'Inventory Manager',
    role: Role.WAREHOUSE,
    passwordPlain: 'Warehouse@1234',
  },
  {
    email: 'accounts@fundsroom.com',
    name: 'Finance Controller',
    role: Role.ACCOUNTS,
    passwordPlain: 'Accounts@1234',
  },
];

export async function seedUsers(): Promise<void> {
  console.log('🌱 Seeding Funds Room user accounts...');

  for (const u of SEED_USERS) {
    const hashedPassword = await hashPassword(u.passwordPlain);
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: {
        name: u.name,
        role: u.role,
        password: hashedPassword,
        isActive: true,
      },
      create: {
        email: u.email,
        name: u.name,
        role: u.role,
        password: hashedPassword,
        isActive: true,
      },
    });

    console.log(`  ✓ Seeded User: ${user.email} [${user.role}] (ID: ${user.id})`);
  }

  console.log('✅ User seeding completed successfully.');
}

if (require.main === module) {
  seedUsers()
    .catch((err) => {
      console.error('❌ Seeding failed:', err);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
