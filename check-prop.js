const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const prop = await prisma.property.findUnique({
    where: { id: 'de7b3151-f1ff-41a3-bd1d-ad7bf6ceec4b' },
  });
  console.log('PROPERTY RECORD:', JSON.stringify(prop, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
