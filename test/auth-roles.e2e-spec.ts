import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { GlobalExceptionFilter } from '../src/common/filters/http-exception.filter';

describe('Complete Authentication & Role Workflows (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let server: any;

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

  let testPropertyId: string;
  let saToken: string;
  let adminToken: string;
  let adminUserId: string;
  let agentUserId: string;
  let landlordUserId: string;
  let caretakerUserId: string;
  let tenantUserId: string;
  let regularUserId: string;
  let rejectedUserId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }));
    app.useGlobalFilters(new GlobalExceptionFilter());

    await app.init();
    server = app.getHttpServer();
    prisma = app.get(PrismaService);

    const superAdminUser = await prisma.user.findFirst({ where: { role: 'SUPER_ADMIN' } });
    if (!superAdminUser) {
      throw new Error('Super Admin user missing.');
    }

    const prop = await prisma.property.create({
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
    testPropertyId = prop.id;
  }, 30000);

  afterAll(async () => {
    if (prisma && testPropertyId) {
      await prisma.property.delete({ where: { id: testPropertyId } }).catch(() => {});
      const allTestEmails = Object.values(emails);
      await prisma.notification.deleteMany({ where: { user: { email: { in: allTestEmails } } } }).catch(() => {});
      await prisma.user.deleteMany({ where: { email: { in: allTestEmails } } }).catch(() => {});
    }
    if (app) {
      await app.close();
    }
  }, 30000);

  it('1. SUPER_ADMIN Login with Seeded Credentials', async () => {
    const email = process.env.SUPER_ADMIN_EMAIL || 'superadmin@realtor.com';
    const password = process.env.SUPER_ADMIN_PASSWORD || 'SuperAdminPassword123!';

    const res = await request(server)
      .post('/api/v1/auth/login')
      .send({ email, password })
      .expect(201);

    expect(res.body.access_token).toBeDefined();
    saToken = res.body.access_token;
  });

  it('2. SUPER_ADMIN Self-Registration Rejection (403)', async () => {
    await request(server)
      .post('/api/v1/auth/register')
      .send({
        name: 'Fake Super Admin',
        email: emails.superAdminReject,
        password: 'Password123!',
        role: 'SUPER_ADMIN',
      })
      .expect(403);
  });

  it('3. Standard USER Registration & Immediate Login', async () => {
    const regRes = await request(server)
      .post('/api/v1/auth/register')
      .send({
        name: 'Test Regular User',
        email: emails.user,
        password: 'Password123!',
        role: 'USER',
      })
      .expect(201);

    expect(regRes.body.pending).toBe(false);
    expect(regRes.body.user.status).toBe('APPROVED');
    regularUserId = regRes.body.user.id;

    const loginRes = await request(server)
      .post('/api/v1/auth/login')
      .send({ email: emails.user, password: 'Password123!' })
      .expect(201);

    expect(loginRes.body.access_token).toBeDefined();
  });

  it('4. ADMIN Registration, Pending Guard & Super Admin Approval', async () => {
    const regRes = await request(server)
      .post('/api/v1/auth/register')
      .send({
        name: 'Test Admin',
        email: emails.admin,
        password: 'Password123!',
        role: 'ADMIN',
      })
      .expect(201);

    expect(regRes.body.pending).toBe(true);
    adminUserId = regRes.body.user.id;

    // Login blocked while pending
    await request(server)
      .post('/api/v1/auth/login')
      .send({ email: emails.admin, password: 'Password123!' })
      .expect(403);

    // Super Admin approves Admin
    await request(server)
      .patch(`/api/v1/auth/approve/${adminUserId}`)
      .set('Authorization', `Bearer ${saToken}`)
      .expect(200);

    // Login post-approval
    const loginRes = await request(server)
      .post('/api/v1/auth/login')
      .send({ email: emails.admin, password: 'Password123!' })
      .expect(201);

    expect(loginRes.body.access_token).toBeDefined();
    adminToken = loginRes.body.access_token;
  });

  it('5. AGENT Registration & Admin Approval', async () => {
    const regRes = await request(server)
      .post('/api/v1/auth/register')
      .send({
        name: 'Test Agent',
        email: emails.agent,
        password: 'Password123!',
        role: 'AGENT',
      })
      .expect(201);

    agentUserId = regRes.body.user.id;

    await request(server)
      .patch(`/api/v1/auth/approve/${agentUserId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const loginRes = await request(server)
      .post('/api/v1/auth/login')
      .send({ email: emails.agent, password: 'Password123!' })
      .expect(201);

    expect(loginRes.body.access_token).toBeDefined();
  });

  it('6. LANDLORD Registration & Approval', async () => {
    const regRes = await request(server)
      .post('/api/v1/auth/register')
      .send({
        name: 'Test Landlord',
        email: emails.landlord,
        password: 'Password123!',
        role: 'LANDLORD',
      })
      .expect(201);

    landlordUserId = regRes.body.user.id;

    await request(server)
      .patch(`/api/v1/auth/approve/${landlordUserId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const loginRes = await request(server)
      .post('/api/v1/auth/login')
      .send({ email: emails.landlord, password: 'Password123!' })
      .expect(201);

    expect(loginRes.body.access_token).toBeDefined();
  });

  it('7. CARETAKER Registration (Validation & Approval)', async () => {
    // Missing propertyId -> 400
    await request(server)
      .post('/api/v1/auth/register')
      .send({
        name: 'Test Caretaker',
        email: emails.caretaker,
        password: 'Password123!',
        role: 'CARETAKER',
      })
      .expect(400);

    // Valid propertyId -> 201
    const regRes = await request(server)
      .post('/api/v1/auth/register')
      .send({
        name: 'Test Caretaker',
        email: emails.caretaker,
        password: 'Password123!',
        role: 'CARETAKER',
        propertyId: testPropertyId,
      })
      .expect(201);

    caretakerUserId = regRes.body.user.id;

    await request(server)
      .patch(`/api/v1/auth/approve/${caretakerUserId}`)
      .set('Authorization', `Bearer ${saToken}`)
      .expect(200);

    const loginRes = await request(server)
      .post('/api/v1/auth/login')
      .send({ email: emails.caretaker, password: 'Password123!' })
      .expect(201);

    expect(loginRes.body.access_token).toBeDefined();
  });

  it('8. TENANT Registration (Validation & Approval)', async () => {
    const regRes = await request(server)
      .post('/api/v1/auth/register')
      .send({
        name: 'Test Tenant',
        email: emails.tenant,
        password: 'Password123!',
        role: 'TENANT',
        propertyId: testPropertyId,
      })
      .expect(201);

    tenantUserId = regRes.body.user.id;

    await request(server)
      .patch(`/api/v1/auth/approve/${tenantUserId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const loginRes = await request(server)
      .post('/api/v1/auth/login')
      .send({ email: emails.tenant, password: 'Password123!' })
      .expect(201);

    expect(loginRes.body.access_token).toBeDefined();
  });

  it('9. Registration REJECTION Flow', async () => {
    const regRes = await request(server)
      .post('/api/v1/auth/register')
      .send({
        name: 'Test Rejected Agent',
        email: emails.rejected,
        password: 'Password123!',
        role: 'AGENT',
      })
      .expect(201);

    rejectedUserId = regRes.body.user.id;

    await request(server)
      .patch(`/api/v1/auth/reject/${rejectedUserId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    await request(server)
      .post('/api/v1/auth/login')
      .send({ email: emails.rejected, password: 'Password123!' })
      .expect(403);
  });

  it('10. Account BLOCK & UNBLOCK Flow', async () => {
    // Block user
    await request(server)
      .patch(`/api/v1/auth/block/${regularUserId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    // Login while blocked
    await request(server)
      .post('/api/v1/auth/login')
      .send({ email: emails.user, password: 'Password123!' })
      .expect(403);

    // Unblock user
    await request(server)
      .patch(`/api/v1/auth/unblock/${regularUserId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    // Login after unblock
    const loginRes = await request(server)
      .post('/api/v1/auth/login')
      .send({ email: emails.user, password: 'Password123!' })
      .expect(201);

    expect(loginRes.body.access_token).toBeDefined();
  });
});
