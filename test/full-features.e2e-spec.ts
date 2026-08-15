import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { GlobalExceptionFilter } from '../src/common/filters/http-exception.filter';
import { JwtService } from '@nestjs/jwt';

describe('Full Features & New Endpoints (e2e)', () => {
  let app: INestApplication;
  let mockPrisma: any;
  let jwtService: JwtService;

  let superAdminToken: string;
  let userToken: string;

  beforeAll(async () => {
    const superAdminUser = {
      id: 'sa-999',
      name: 'Super Admin',
      email: 'superadmin@realtor.com',
      role: 'SUPER_ADMIN',
      status: 'APPROVED',
      isBlocked: false,
    };

    const regularUser = {
      id: 'usr-888',
      name: 'E2E Tester',
      email: 'e2e.tester@example.com',
      role: 'USER',
      status: 'APPROVED',
      isBlocked: false,
    };

    mockPrisma = {
      $connect: jest.fn().mockResolvedValue(undefined),
      $disconnect: jest.fn().mockResolvedValue(undefined),
      user: {
        findUnique: jest.fn().mockImplementation(({ where }) => {
          if (where.id === 'sa-999') return Promise.resolve(superAdminUser);
          if (where.id === 'usr-888') return Promise.resolve(regularUser);
          return Promise.resolve(null);
        }),
        findMany: jest.fn().mockResolvedValue([superAdminUser, regularUser]),
        count: jest.fn().mockResolvedValue(2),
      },
      userAiSubscription: {
        findUnique: jest.fn().mockResolvedValue({
          userId: 'usr-888',
          plan: 'STARTER',
          creditsRemaining: 50,
          status: 'ACTIVE',
        }),
        findMany: jest.fn().mockResolvedValue([
          { plan: 'STARTER', paymentProvider: 'STRIPE' },
          { plan: 'PRO', paymentProvider: 'STRIPE' },
        ]),
        upsert: jest.fn().mockResolvedValue({
          userId: 'usr-888',
          plan: 'STARTER',
          creditsRemaining: 80,
          status: 'ACTIVE',
        }),
        create: jest.fn().mockResolvedValue({
          id: 'sub-1',
          userId: 'usr-888',
          plan: 'STARTER',
          creditsRemaining: 30,
        }),
        update: jest.fn().mockResolvedValue({
          userId: 'usr-888',
          plan: 'STARTER',
          creditsRemaining: 49,
        }),
      },
      property: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'p-1',
            title: '3 Bedroom Flat in Lekki',
            location: 'Lekki, Lagos',
            price: 2500000,
            type: 'APARTMENT',
            listingType: 'RENT',
          },
        ]),
        count: jest.fn().mockResolvedValue(1),
      },
      notification: {
        create: jest.fn().mockResolvedValue({ id: 'notif-1' }),
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
      auditLog: {
        create: jest.fn().mockResolvedValue({ id: 'audit-1' }),
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'log-1',
            action: 'LOGIN',
            module: 'AUTH',
            performedBy: 'usr-888',
            userRole: 'USER',
            status: 'SUCCESS',
            createdAt: new Date().toISOString(),
          },
        ]),
        count: jest.fn().mockResolvedValue(1),
      },
      supportInvitation: {
        create: jest.fn().mockResolvedValue({
          id: 'inv-1',
          email: 'support@example.com',
          token: 'SUP-INV-12345',
          status: 'PENDING',
          expiresAt: new Date(Date.now() + 86400000),
        }),
      },
      dispute: {
        create: jest.fn().mockResolvedValue({
          id: 'disp-1',
          ticketNumber: 'DISP-2026-1001',
          category: 'SECURITY_DEPOSIT',
          subject: 'Deposit Refund Claim',
          description: 'Landlord withheld deposit without cause',
          status: 'OPEN',
          initiatorId: 'usr-888',
          respondentId: 'sa-999',
        }),
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'disp-1',
            ticketNumber: 'DISP-2026-1001',
            category: 'SECURITY_DEPOSIT',
            subject: 'Deposit Refund Claim',
            status: 'OPEN',
            initiator: { id: 'usr-888', name: 'E2E Tester', email: 'e2e.tester@example.com', role: 'USER' },
            respondent: { id: 'sa-999', name: 'Super Admin', email: 'superadmin@realtor.com', role: 'SUPER_ADMIN' },
            evidences: [],
            _count: { messages: 0 },
          },
        ]),
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
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    app.useGlobalFilters(new GlobalExceptionFilter());

    await app.init();

    superAdminToken = jwtService.sign({ sub: 'sa-999', role: 'SUPER_ADMIN' });
    userToken = jwtService.sign({ sub: 'usr-888', role: 'USER' });
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  describe('1. Notifications Module', () => {
    it('GET /api/v1/notifications (Fetch User Notifications)', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/notifications')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(res.body.data).toBeDefined();
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('GET /api/v1/notifications/unread-count', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/notifications/unread-count')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(res.body.count).toBeDefined();
    });

    it('PATCH /api/v1/notifications/read-all', async () => {
      await request(app.getHttpServer())
        .patch('/api/v1/notifications/read-all')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);
    });
  });

  describe('2. AI Subscription & Credits Module', () => {
    it('GET /api/v1/ai/subscription/me (Fetch Active AI Credits)', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/ai/subscription/me')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(res.body.plan).toBeDefined();
      expect(res.body.creditsRemaining).toBeDefined();
    });

    it('POST /api/v1/ai/subscription/checkout (Initiate Stripe / Paystack Checkout)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/ai/subscription/checkout')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          planTier: 'STARTER',
          gateway: 'STRIPE',
          currency: 'USD',
        })
        .expect(200);

      expect(res.body.checkoutUrl).toBeDefined();
      expect(res.body.reference).toBeDefined();
    });

    it('POST /api/v1/ai/subscription/verify (Grant AI Credits)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/ai/subscription/verify')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          reference: `E2E-REF-${Date.now()}`,
          planTier: 'STARTER',
          gateway: 'STRIPE',
        })
        .expect(200);

      expect(res.body.plan).toBe('STARTER');
      expect(res.body.creditsRemaining).toBeGreaterThanOrEqual(30);
    });
  });

  describe('3. AI Assistants Endpoints', () => {
    it('POST /api/v1/ai/property-assistant (Natural Language Search Parser)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/ai/property-assistant')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          prompt: '3 bedroom flat in Lekki under 2.5 million for rent',
        })
        .expect(200);

      expect(res.body.reply).toBeDefined();
      expect(res.body.properties).toBeDefined();
      expect(Array.isArray(res.body.properties)).toBe(true);
    });

    it('POST /api/v1/ai/listing-assistant (Listing Copy Generator)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/ai/listing-assistant')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          prompt: 'Write a catchy description for a 3-bedroom duplex',
          context: {
            city: 'Lekki',
            bedrooms: 3,
            bathrooms: 3,
            type: 'Duplex',
            purpose: 'RENT',
          },
        })
        .expect(200);

      expect(res.body.reply).toBeDefined();
      expect(typeof res.body.reply).toBe('string');
    });
  });

  describe('4. Governance & Executive Dashboards', () => {
    it('GET /api/v1/dashboard/super-admin (SUPER_ADMIN Executive Metrics)', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/dashboard/super-admin')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(200);

      expect(res.body.role).toBe('SUPER_ADMIN');
      expect(res.body.totalUsers).toBeDefined();
      expect(res.body.totalAuditLogs).toBeDefined();
    });

    it('GET /api/v1/audit (SUPER_ADMIN System Audit Trail Log)', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/audit?limit=10')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(200);

      expect(res.body.data).toBeDefined();
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('GET /api/v1/audit (Rejects regular USER role - 403 Forbidden)', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/audit')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });
  });

  describe('5. Two-Party Dispute & Support Mediation System', () => {
    it('POST /api/v1/users/support/invite (Super Admin invites Support Agent)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/users/support/invite')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          email: 'support.agent@example.com',
          name: 'Support Agent Jane',
        })
        .expect(201);

      expect(res.body.message).toBeDefined();
      expect(res.body.inviteLink).toBeDefined();
    });

    it('POST /api/v1/disputes (File a Two-Party Dispute Claim)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/disputes')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          category: 'SECURITY_DEPOSIT',
          subject: 'Security Deposit Refund Claim',
          description: 'Deposit withheld without itemized damages',
          respondentId: 'sa-999',
        })
        .expect(201);

      expect(res.body.ticketNumber).toBeDefined();
      expect(res.body.status).toBe('OPEN');
    });

    it('GET /api/v1/disputes (Fetch Dispute Ticket Queue)', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/disputes')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
    });
  });
});
