import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';

describe('API Endpoints (e2e)', () => {
  let app: INestApplication<App>;
  let jwtService: JwtService;
  let mockPrisma: any;

  beforeEach(async () => {
    mockPrisma = {
      $connect: jest.fn().mockResolvedValue(undefined),
      $disconnect: jest.fn().mockResolvedValue(undefined),
      user: {
        findUnique: jest.fn().mockImplementation(({ where }) => {
          if (where.id === 'user-123') {
            return Promise.resolve({
              id: 'user-123',
              email: 'test@example.com',
              role: 'USER',
              isBlocked: false,
              status: 'APPROVED',
            });
          }
          if (where.id === 'agent-123') {
            return Promise.resolve({
              id: 'agent-123',
              email: 'agent@example.com',
              role: 'AGENT',
              isBlocked: false,
              status: 'APPROVED',
            });
          }
          if (where.email === 'test@example.com') {
            return Promise.resolve({
              id: 'user-123',
              email: 'test@example.com',
              password: '$2a$10$hashedpasswordplaceholderhere',
              role: 'USER',
              isBlocked: false,
              status: 'APPROVED',
            });
          }
          return Promise.resolve(null);
        }),
        create: jest.fn(),
        update: jest.fn(),
      },
      property: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
      },
      notification: {
        create: jest.fn().mockResolvedValue({ id: 'notif-1' }),
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
      auditLog: {
        create: jest.fn().mockResolvedValue({ id: 'audit-1' }),
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
      rentPayment: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      lease: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(mockPrisma)
      .compile();

    jwtService = moduleFixture.get<JwtService>(JwtService);
    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('Auth Flow', () => {
    it('POST /auth/register (Success)', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com',
        role: 'USER',
        status: 'APPROVED',
      });

      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          name: 'Test User',
          email: 'test@example.com',
          phone: '+2348012345678',
          password: 'password123',
          role: 'USER',
        })
        .expect(201);

      expect(response.body.message).toContain('User registered successfully');
      expect(response.body.user.email).toBe('test@example.com');
    });

    it('POST /auth/login (Success)', async () => {
      const bcrypt = require('bcryptjs');
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);

      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123',
        })
        .expect(201);

      expect(response.body.message).toContain('Login successful');
      expect(response.body.access_token).toBeDefined();
    });
  });

  describe('Properties Module', () => {
    it('GET /properties (Public List)', async () => {
      mockPrisma.property.findMany.mockResolvedValue([
        {
          id: 'prop-1',
          title: 'Stunning Ocean View Duplex',
          description: 'A beautiful duplex',
          price: 5000000,
          type: 'HOUSE',
          listingType: 'RENT',
          location: 'Lekki, Lagos',
          imageUrls: ['image1.jpg'],
          bedrooms: 4,
          bathrooms: 4,
          available: true,
          status: 'PUBLISHED',
          agentId: 'agent-123',
          agent: {
            id: 'agent-123',
            name: 'Sandra Nwachukwu',
            profileImage: 'sandra.jpg',
            status: 'APPROVED',
          },
        },
      ]);
      mockPrisma.property.count.mockResolvedValue(1);

      const response = await request(app.getHttpServer())
        .get('/properties')
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].title).toBe('Stunning Ocean View Duplex');
    });

    it('GET /properties/:id (Public Detail)', async () => {
      mockPrisma.property.findUnique.mockResolvedValue({
        id: 'prop-1',
        title: 'Stunning Ocean View Duplex',
        description: 'A beautiful duplex',
        price: 5000000,
        type: 'HOUSE',
        listingType: 'RENT',
        location: 'Lekki, Lagos',
        imageUrls: ['image1.jpg'],
        bedrooms: 4,
        bathrooms: 4,
        available: true,
        status: 'PUBLISHED',
        agentId: 'agent-123',
        agent: {
          id: 'agent-123',
          name: 'Sandra Nwachukwu',
          profileImage: 'sandra.jpg',
          status: 'APPROVED',
        },
      });

      const response = await request(app.getHttpServer())
        .get('/properties/prop-1')
        .expect(200);

      expect(response.body.title).toBe('Stunning Ocean View Duplex');
    });

    it('GET /properties/:id/contact (Gated - Unauthorized without token)', async () => {
      await request(app.getHttpServer())
        .get('/properties/prop-1/contact')
        .expect(401);
    });

    it('GET /properties/:id/contact (Gated - Authorized)', async () => {
      mockPrisma.property.findUnique.mockResolvedValue({
        id: 'prop-1',
        agent: {
          name: 'Sandra Nwachukwu',
          email: 'sandra@example.com',
          phone: '08012345678',
        },
      });

      const token = jwtService.sign({ sub: 'user-123', role: 'USER' });

      const response = await request(app.getHttpServer())
        .get('/properties/prop-1/contact')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.email).toBe('sandra@example.com');
      expect(response.body.phone).toBe('08012345678');
    });

    it('POST /properties (Protected - Requires AGENT role)', async () => {
      mockPrisma.property.create.mockResolvedValue({
        id: 'prop-2',
        title: 'New Property',
      });

      const token = jwtService.sign({ sub: 'agent-123', role: 'AGENT' });

      const response = await request(app.getHttpServer())
        .post('/properties')
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'New Property',
          description: 'Description here',
          price: 4500000,
          type: 'APARTMENT',
          category: 'APARTMENT',
          purpose: 'RENT',
          apartmentType: 'PENTHOUSE',
          location: 'Ikoyi, Lagos',
          imageUrls: ['img.jpg'],
        })
        .expect(201);

      expect(response.body.id).toBe('prop-2');
    });

    it('POST /properties (Protected - Rejects USER role)', async () => {
      const token = jwtService.sign({ sub: 'user-123', role: 'USER' });

      await request(app.getHttpServer())
        .post('/properties')
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'New Property',
          description: 'Description here',
          price: 4500000,
          type: 'APARTMENT',
          category: 'APARTMENT',
          purpose: 'RENT',
          apartmentType: 'PENTHOUSE',
          location: 'Ikoyi, Lagos',
          imageUrls: ['img.jpg'],
        })
        .expect(403);
    });
  });
});
