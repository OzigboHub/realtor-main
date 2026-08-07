import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { GlobalExceptionFilter } from '../src/common/filters/http-exception.filter';

async function runTests() {
  console.log('--- STARTING COMPLETE AUTH & USER REGISTRATION/LOGIN TEST SUITE ---\n');

  const ts = Date.now();
  const emails = {
    superAdminReject: `sa.reject.${ts}@example.com`,
    user: `user.${ts}@example.com`,
    admin: `admin.${ts}@example.com`,
    agent: `agent.${ts}@example.com`,
    landlord: `landlord.${ts}@example.com`,
    caretaker: `caretaker.${ts}@example.com`,
    tenant: `tenant.${ts}@example.com`,
    rejected: `rejected.${ts}@example.com`,
  };

  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app: INestApplication = moduleFixture.createNestApplication();
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }));
  app.useGlobalFilters(new GlobalExceptionFilter());

  await app.init();
  const server = app.getHttpServer();
  const prisma = app.get(PrismaService);

  // Super Admin check
  const superAdminUser = await prisma.user.findFirst({
    where: { role: 'SUPER_ADMIN' },
  });

  if (!superAdminUser) {
    throw new Error('Super Admin user missing. Please run seed script first.');
  }

  // Create test property for Caretaker & Tenant testing
  const testProperty = await prisma.property.create({
    data: {
      title: 'Auth Test Villa',
      description: 'Property for testing Caretaker and Tenant registration',
      price: 1500000,
      type: 'APARTMENT',
      location: 'Victoria Island, Lagos',
      imageUrls: ['https://res.cloudinary.com/heeimzmy/image/upload/v1722690000/realtor/luxury_villa_test.jpg'],
      agentId: superAdminUser.id,
    },
  });
  console.log(`✔ Created test property (ID: ${testProperty.id})\n`);

  try {
    // -------------------------------------------------------------
    // TEST 1: SUPER ADMIN LOGIN (Seeded credentials)
    // -------------------------------------------------------------
    console.log('1. Testing SUPER_ADMIN Login...');
    const superAdminEmail = process.env.SUPER_ADMIN_EMAIL || 'superadmin@realtor.com';
    const superAdminPassword = process.env.SUPER_ADMIN_PASSWORD || 'SuperAdminPassword123!';

    const saLoginRes = await request(server)
      .post('/api/v1/auth/login')
      .send({ email: superAdminEmail, password: superAdminPassword })
      .expect(201);

    if (!saLoginRes.body.access_token) {
      throw new Error(`Super Admin login failed: ${JSON.stringify(saLoginRes.body)}`);
    }
    const saToken = saLoginRes.body.access_token;
    console.log('   PASSED: SUPER_ADMIN logged in successfully.\n');

    // -------------------------------------------------------------
    // TEST 2: SUPER ADMIN SELF-REGISTRATION (Should Fail 403)
    // -------------------------------------------------------------
    console.log('2. Testing SUPER_ADMIN Self-Registration (Expect 403)...');
    await request(server)
      .post('/api/v1/auth/register')
      .send({
        name: 'Fake Super Admin',
        email: emails.superAdminReject,
        password: 'Password123!',
        role: 'SUPER_ADMIN',
      })
      .expect(403);
    console.log('   PASSED: SUPER_ADMIN self-registration correctly rejected (403).\n');

    // -------------------------------------------------------------
    // TEST 3: STANDARD USER REGISTRATION & IMMEDIATE LOGIN
    // -------------------------------------------------------------
    console.log('3. Testing Standard USER Registration & Immediate Login...');
    const userRegRes = await request(server)
      .post('/api/v1/auth/register')
      .send({
        name: 'Test Regular User',
        email: emails.user,
        password: 'Password123!',
        role: 'USER',
      })
      .expect(201);

    if (userRegRes.body.pending !== false || userRegRes.body.user.status !== 'APPROVED') {
      throw new Error(`USER registration status unexpected: ${JSON.stringify(userRegRes.body)}`);
    }
    console.log('   ✔ USER registered & auto-approved.');

    const userLoginRes = await request(server)
      .post('/api/v1/auth/login')
      .send({ email: emails.user, password: 'Password123!' })
      .expect(201);

    if (!userLoginRes.body.access_token) {
      throw new Error(`USER login failed: ${JSON.stringify(userLoginRes.body)}`);
    }
    console.log('   PASSED: Standard USER registered & logged in successfully.\n');

    // -------------------------------------------------------------
    // TEST 4: ADMIN REGISTRATION, PENDING GUARD & APPROVAL
    // -------------------------------------------------------------
    console.log('4. Testing ADMIN Registration, Pending Guard & Super Admin Approval...');
    const adminRegRes = await request(server)
      .post('/api/v1/auth/register')
      .send({
        name: 'Test Admin',
        email: emails.admin,
        password: 'Password123!',
        role: 'ADMIN',
      })
      .expect(201);

    if (adminRegRes.body.pending !== true) {
      throw new Error(`ADMIN registration failed: ${JSON.stringify(adminRegRes.body)}`);
    }
    const adminId = adminRegRes.body.user.id;
    console.log('   ✔ ADMIN registered (Status: PENDING).');

    // Try login while pending
    await request(server)
      .post('/api/v1/auth/login')
      .send({ email: emails.admin, password: 'Password123!' })
      .expect(403);
    console.log('   ✔ ADMIN login blocked while PENDING.');

    // Super Admin approves Admin
    await request(server)
      .patch(`/api/v1/auth/approve/${adminId}`)
      .set('Authorization', `Bearer ${saToken}`)
      .expect(200);
    console.log('   ✔ Super Admin approved ADMIN.');

    // Login after approval
    const adminLoginRes = await request(server)
      .post('/api/v1/auth/login')
      .send({ email: emails.admin, password: 'Password123!' })
      .expect(201);

    const adminToken = adminLoginRes.body.access_token;
    console.log('   PASSED: ADMIN registration, pending check, approval & login succeeded.\n');

    // -------------------------------------------------------------
    // TEST 5: AGENT REGISTRATION & ADMIN APPROVAL
    // -------------------------------------------------------------
    console.log('5. Testing AGENT Registration & Admin Approval...');
    const agentRegRes = await request(server)
      .post('/api/v1/auth/register')
      .send({
        name: 'Test Agent',
        email: emails.agent,
        password: 'Password123!',
        role: 'AGENT',
      })
      .expect(201);

    const agentId = agentRegRes.body.user.id;

    // Admin approves Agent
    await request(server)
      .patch(`/api/v1/auth/approve/${agentId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const agentLoginRes = await request(server)
      .post('/api/v1/auth/login')
      .send({ email: emails.agent, password: 'Password123!' })
      .expect(201);

    if (!agentLoginRes.body.access_token) {
      throw new Error(`AGENT login failed: ${JSON.stringify(agentLoginRes.body)}`);
    }
    console.log('   PASSED: AGENT registration, approval by ADMIN & login succeeded.\n');

    // -------------------------------------------------------------
    // TEST 6: LANDLORD REGISTRATION & APPROVAL
    // -------------------------------------------------------------
    console.log('6. Testing LANDLORD Registration & Approval...');
    const landlordRegRes = await request(server)
      .post('/api/v1/auth/register')
      .send({
        name: 'Test Landlord',
        email: emails.landlord,
        password: 'Password123!',
        role: 'LANDLORD',
      })
      .expect(201);

    const landlordId = landlordRegRes.body.user.id;

    // Admin approves Landlord
    await request(server)
      .patch(`/api/v1/auth/approve/${landlordId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const landlordLoginRes = await request(server)
      .post('/api/v1/auth/login')
      .send({ email: emails.landlord, password: 'Password123!' })
      .expect(201);

    if (!landlordLoginRes.body.access_token) {
      throw new Error(`LANDLORD login failed: ${JSON.stringify(landlordLoginRes.body)}`);
    }
    console.log('   PASSED: LANDLORD registered, approved & logged in.\n');

    // -------------------------------------------------------------
    // TEST 7: CARETAKER REGISTRATION & APPROVAL
    // -------------------------------------------------------------
    console.log('7. Testing CARETAKER Registration (Validation & Approval)...');
    // Try without propertyId (Should fail 400)
    await request(server)
      .post('/api/v1/auth/register')
      .send({
        name: 'Test Caretaker',
        email: emails.caretaker,
        password: 'Password123!',
        role: 'CARETAKER',
      })
      .expect(400);
    console.log('   ✔ CARETAKER registration without propertyId correctly failed (400).');

    // Register with valid propertyId
    const ctRegRes = await request(server)
      .post('/api/v1/auth/register')
      .send({
        name: 'Test Caretaker',
        email: emails.caretaker,
        password: 'Password123!',
        role: 'CARETAKER',
        propertyId: testProperty.id,
      })
      .expect(201);

    const caretakerId = ctRegRes.body.user.id;

    // Super Admin approves Caretaker
    await request(server)
      .patch(`/api/v1/auth/approve/${caretakerId}`)
      .set('Authorization', `Bearer ${saToken}`)
      .expect(200);

    const ctLoginRes = await request(server)
      .post('/api/v1/auth/login')
      .send({ email: emails.caretaker, password: 'Password123!' })
      .expect(201);

    if (!ctLoginRes.body.access_token) {
      throw new Error(`CARETAKER login failed: ${JSON.stringify(ctLoginRes.body)}`);
    }
    console.log('   PASSED: CARETAKER registration, validation, approval & login succeeded.\n');

    // -------------------------------------------------------------
    // TEST 8: TENANT REGISTRATION & APPROVAL
    // -------------------------------------------------------------
    console.log('8. Testing TENANT Registration (Validation & Approval)...');
    const tenantRegRes = await request(server)
      .post('/api/v1/auth/register')
      .send({
        name: 'Test Tenant',
        email: emails.tenant,
        password: 'Password123!',
        role: 'TENANT',
        propertyId: testProperty.id,
      })
      .expect(201);

    const tenantId = tenantRegRes.body.user.id;

    // Admin approves Tenant
    await request(server)
      .patch(`/api/v1/auth/approve/${tenantId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const tenantLoginRes = await request(server)
      .post('/api/v1/auth/login')
      .send({ email: emails.tenant, password: 'Password123!' })
      .expect(201);

    if (!tenantLoginRes.body.access_token) {
      throw new Error(`TENANT login failed: ${JSON.stringify(tenantLoginRes.body)}`);
    }
    console.log('   PASSED: TENANT registration, approval & login succeeded.\n');

    // -------------------------------------------------------------
    // TEST 9: REJECTION FLOW
    // -------------------------------------------------------------
    console.log('9. Testing Registration REJECTION Flow...');
    const rejectRegRes = await request(server)
      .post('/api/v1/auth/register')
      .send({
        name: 'Test Rejected Agent',
        email: emails.rejected,
        password: 'Password123!',
        role: 'AGENT',
      })
      .expect(201);

    // Admin rejects user
    await request(server)
      .patch(`/api/v1/auth/reject/${rejectRegRes.body.user.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    await request(server)
      .post('/api/v1/auth/login')
      .send({ email: emails.rejected, password: 'Password123!' })
      .expect(403);
    console.log('   PASSED: User rejection flow verified (Login blocked with 403).\n');

    // -------------------------------------------------------------
    // TEST 10: BLOCKING & UNBLOCKING FLOW
    // -------------------------------------------------------------
    console.log('10. Testing BLOCK / UNBLOCK Account Flow...');
    await request(server)
      .patch(`/api/v1/auth/block/${userRegRes.body.user.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    await request(server)
      .post('/api/v1/auth/login')
      .send({ email: emails.user, password: 'Password123!' })
      .expect(403);
    console.log('   ✔ Blocked user login correctly denied (403).');

    // Unblock
    await request(server)
      .patch(`/api/v1/auth/unblock/${userRegRes.body.user.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    await request(server)
      .post('/api/v1/auth/login')
      .send({ email: emails.user, password: 'Password123!' })
      .expect(201);
    console.log('   PASSED: User block & unblock flow verified.\n');

    console.log('===========================================================');
    console.log('🎉 ALL 10 AUTHENTICATION & REGISTRATION TESTS PASSED! 🎉');
    console.log('===========================================================');
  } finally {
    // Clean up created property and test users
    await prisma.property.delete({ where: { id: testProperty.id } }).catch(() => {});
    const allTestEmails = Object.values(emails);
    await prisma.notification.deleteMany({ where: { user: { email: { in: allTestEmails } } } }).catch(() => {});
    await prisma.user.deleteMany({ where: { email: { in: allTestEmails } } }).catch(() => {});
    await app.close();
    process.exit(0);
  }
}

runTests().catch((err) => {
  console.error('\n❌ TEST SUITE FAILED:', err);
  process.exit(1);
});
