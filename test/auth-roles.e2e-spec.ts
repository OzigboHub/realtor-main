import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { GlobalExceptionFilter } from '../src/common/filters/http-exception.filter';
import { JwtService } from '@nestjs/jwt';

describe('Complete Authentication & Role Workflows (e2e)', () => {
  let app: INestApplication;
  let mockPrisma: any;
  let jwtService: JwtService;

  const usersStore = new Map<string, any>();
  const VALID_UUID = '123e4567-e89b-42d3-a456-426614174000';

  beforeAll(async () => {
    // Seed initial Super Admin & Test Property in mock memory
    const superAdmin = {
      id: 'sa-123',
      name: 'Super Admin',
      email: 'superadmin@realtor.com',
      password: '$2a$10$e0MYzXyjpJS7Pd0RVvHwHe1aQz.4d9uE2qZ3U5O6a7b8c9d0e1f2g', // hashed password
      role: 'SUPER_ADMIN',
      status: 'APPROVED',
      isBlocked: false,
    };
    usersStore.set(superAdmin.id, superAdmin);
    usersStore.set(superAdmin.email, superAdmin);

    mockPrisma = {
      $connect: jest.fn().mockResolvedValue(undefined),
      $disconnect: jest.fn().mockResolvedValue(undefined),
      user: {
        findUnique: jest.fn().mockImplementation(({ where }) => {
          if (where.id)
            return Promise.resolve(usersStore.get(where.id) || null);
          if (where.email)
            return Promise.resolve(usersStore.get(where.email) || null);
          return Promise.resolve(null);
        }),
        findFirst: jest.fn().mockImplementation(({ where }) => {
          if (where.role === 'SUPER_ADMIN') return Promise.resolve(superAdmin);
          return Promise.resolve(null);
        }),
        create: jest.fn().mockImplementation(({ data }) => {
          const newUser = {
            id: `user-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
            ...data,
            isBlocked: false,
          };
          usersStore.set(newUser.id, newUser);
          usersStore.set(newUser.email, newUser);
          return Promise.resolve(newUser);
        }),
        update: jest.fn().mockImplementation(({ where, data }) => {
          const existing = usersStore.get(where.id);
          if (!existing) return Promise.resolve(null);
          const updated = { ...existing, ...data };
          usersStore.set(updated.id, updated);
          usersStore.set(updated.email, updated);
          return Promise.resolve(updated);
        }),
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
      property: {
        findUnique: jest.fn().mockResolvedValue({
          id: VALID_UUID,
          title: 'Auth Test Villa',
          agentId: 'sa-123',
          agent: {
            id: 'sa-123',
            name: 'Super Admin',
            role: 'SUPER_ADMIN',
            status: 'APPROVED',
          },
        }),
        create: jest.fn().mockResolvedValue({ id: VALID_UUID }),
        delete: jest.fn().mockResolvedValue({ id: VALID_UUID }),
      },
      notification: {
        create: jest.fn().mockResolvedValue({ id: 'notif-1' }),
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
      auditLog: {
        create: jest.fn().mockResolvedValue({ id: 'audit-1' }),
      },
      rentPayment: { findMany: jest.fn().mockResolvedValue([]) },
      lease: { findMany: jest.fn().mockResolvedValue([]) },
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(mockPrisma)
      .compile();

    jwtService = moduleFixture.get<JwtService>(JwtService);
    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    app.useGlobalFilters(new GlobalExceptionFilter());

    await app.init();
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  let saToken: string;
  let adminToken: string;
  let adminUserId: string;
  let agentUserId: string;
  let landlordUserId: string;
  let caretakerUserId: string;
  let tenantUserId: string;
  let regularUserId: string;
  let rejectedUserId: string;

  const bcrypt = require('bcryptjs');

  it('1. SUPER_ADMIN Login with Seeded Credentials', async () => {
    jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);

    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: 'superadmin@realtor.com',
        password: 'SuperAdminPassword123!',
      })
      .expect(201);

    expect(res.body.access_token).toBeDefined();
    saToken = res.body.access_token;
  });

  it('2. SUPER_ADMIN Self-Registration Rejection (403)', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        name: 'Fake Super Admin',
        email: 'fake.sa@example.com',
        phone: '+2348012345678',
        password: 'Password123!',
        role: 'SUPER_ADMIN',
      })
      .expect(403);
  });

  it('3. Standard USER Registration & Immediate Login', async () => {
    const regRes = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        name: 'Test Regular User',
        email: 'regular.user@example.com',
        phone: '+2348012345678',
        password: 'Password123!',
        role: 'USER',
      })
      .expect(201);

    expect(regRes.body.pending).toBe(false);
    expect(regRes.body.user.status).toBe('APPROVED');
    regularUserId = regRes.body.user.id;

    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'regular.user@example.com', password: 'Password123!' })
      .expect(201);

    expect(loginRes.body.access_token).toBeDefined();
  });

  it('4. ADMIN Registration, Pending Guard & Approval', async () => {
    const regRes = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        name: 'Test Admin',
        email: 'admin.user@example.com',
        phone: '+2348012345678',
        password: 'Password123!',
        role: 'ADMIN',
      })
      .expect(201);

    expect(regRes.body.pending).toBe(true);
    adminUserId = regRes.body.user.id;

    // Login blocked while pending
    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'admin.user@example.com', password: 'Password123!' })
      .expect(403);

    // Super Admin approves Admin
    await request(app.getHttpServer())
      .patch(`/api/v1/users/${adminUserId}/approve`)
      .set('Authorization', `Bearer ${saToken}`)
      .expect(200);

    // Login post-approval
    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'admin.user@example.com', password: 'Password123!' })
      .expect(201);

    expect(loginRes.body.access_token).toBeDefined();
    adminToken = loginRes.body.access_token;
  });

  it('5. AGENT Registration & Admin Approval', async () => {
    const regRes = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        name: 'Test Agent',
        email: 'agent.user@example.com',
        phone: '+2348012345678',
        password: 'Password123!',
        role: 'AGENT',
      })
      .expect(201);

    agentUserId = regRes.body.user.id;

    await request(app.getHttpServer())
      .patch(`/api/v1/users/${agentUserId}/approve`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'agent.user@example.com', password: 'Password123!' })
      .expect(201);

    expect(loginRes.body.access_token).toBeDefined();
  });

  it('6. LANDLORD Registration & Approval', async () => {
    const regRes = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        name: 'Test Landlord',
        email: 'landlord.user@example.com',
        phone: '+2348012345678',
        password: 'Password123!',
        role: 'LANDLORD',
      })
      .expect(201);

    landlordUserId = regRes.body.user.id;

    await request(app.getHttpServer())
      .patch(`/api/v1/users/${landlordUserId}/approve`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'landlord.user@example.com', password: 'Password123!' })
      .expect(201);

    expect(loginRes.body.access_token).toBeDefined();
  });

  it('7. CARETAKER Registration (Validation & Approval)', async () => {
    const regRes = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        name: 'Test Caretaker',
        email: 'caretaker.user@example.com',
        phone: '+2348012345678',
        password: 'Password123!',
        role: 'CARETAKER',
        propertyId: VALID_UUID,
      })
      .expect(201);

    caretakerUserId = regRes.body.user.id;

    await request(app.getHttpServer())
      .patch(`/api/v1/users/${caretakerUserId}/approve`)
      .set('Authorization', `Bearer ${saToken}`)
      .expect(200);

    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'caretaker.user@example.com', password: 'Password123!' })
      .expect(201);

    expect(loginRes.body.access_token).toBeDefined();
  });

  it('8. TENANT Registration (Validation & Approval)', async () => {
    const regRes = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        name: 'Test Tenant',
        email: 'tenant.user@example.com',
        phone: '+2348012345678',
        password: 'Password123!',
        role: 'TENANT',
        propertyId: VALID_UUID,
      })
      .expect(201);

    tenantUserId = regRes.body.user.id;

    await request(app.getHttpServer())
      .patch(`/api/v1/users/${tenantUserId}/approve`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'tenant.user@example.com', password: 'Password123!' })
      .expect(201);

    expect(loginRes.body.access_token).toBeDefined();
  });

  it('9. Registration REJECTION Flow', async () => {
    const regRes = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        name: 'Test Rejected Agent',
        email: 'rejected.agent@example.com',
        phone: '+2348012345678',
        password: 'Password123!',
        role: 'AGENT',
      })
      .expect(201);

    rejectedUserId = regRes.body.user.id;

    await request(app.getHttpServer())
      .patch(`/api/v1/users/${rejectedUserId}/reject`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'rejected.agent@example.com', password: 'Password123!' })
      .expect(403);
  });

  it('10. Account BLOCK & UNBLOCK Flow', async () => {
    // Block user
    await request(app.getHttpServer())
      .patch(`/api/v1/users/${regularUserId}/block`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    // Login while blocked
    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'regular.user@example.com', password: 'Password123!' })
      .expect(403);

    // Unblock user
    await request(app.getHttpServer())
      .patch(`/api/v1/users/${regularUserId}/unblock`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    // Login after unblock
    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'regular.user@example.com', password: 'Password123!' })
      .expect(201);

    expect(loginRes.body.access_token).toBeDefined();
  });
});
