import { PrismaClient, Role, Status } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const superAdminEmail = process.env.SUPER_ADMIN_EMAIL || 'superadmin@realtor.com';
  const superAdminPassword = process.env.SUPER_ADMIN_PASSWORD || 'SuperAdminPassword123!';

  // Check if super admin already exists
  const existingAdmin = await prisma.user.findUnique({
    where: { email: superAdminEmail },
  });

  if (existingAdmin) {
    console.log('Super Admin already exists. Skipping creation.');
    return;
  }

  const hashedPassword = await bcrypt.hash(superAdminPassword, 10);

  const superAdmin = await prisma.user.create({
    data: {
      name: 'Super Admin',
      email: superAdminEmail,
      password: hashedPassword,
      role: Role.SUPER_ADMIN,
      status: Status.APPROVED,
    },
  });

  console.log('Super Admin created successfully:', superAdmin.email);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
