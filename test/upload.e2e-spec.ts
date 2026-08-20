import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';

describe('Upload Module & Cloud Media Storage (e2e)', () => {
  let app: INestApplication;
  let jwtService: JwtService;
  let userToken: string;

  const mockPrisma = {
    $connect: jest.fn().mockResolvedValue(undefined),
    $disconnect: jest.fn().mockResolvedValue(undefined),
    user: {
      findUnique: jest.fn().mockResolvedValue({
        id: 'usr-888',
        name: 'Media Tester',
        email: 'media.tester@example.com',
        role: 'USER',
        status: 'APPROVED',
        isBlocked: false,
      }),
    },
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(mockPrisma)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    app.setGlobalPrefix('api/v1');
    await app.init();

    jwtService = app.get<JwtService>(JwtService);
    userToken = jwtService.sign({
      sub: 'usr-888',
      email: 'media.tester@example.com',
      role: 'USER',
    });
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /api/v1/upload/image (Single Image Upload)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/upload/image')
      .set('Authorization', `Bearer ${userToken}`)
      .attach('file', Buffer.from('fake-image-bytes'), 'test-image.jpg')
      .expect(201);

    expect(res.body.url).toBeDefined();
    expect(res.body.publicId).toBeDefined();
  });

  it('POST /api/v1/upload/images (Batch Image Upload)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/upload/images')
      .set('Authorization', `Bearer ${userToken}`)
      .attach('files', Buffer.from('photo-1-bytes'), 'photo1.jpg')
      .attach('files', Buffer.from('photo-2-bytes'), 'photo2.jpg')
      .expect(201);

    expect(Array.isArray(res.body.urls)).toBe(true);
    expect(res.body.urls.length).toBe(2);
  });

  it('POST /api/v1/upload/document (Document Upload)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/upload/document')
      .set('Authorization', `Bearer ${userToken}`)
      .attach('file', Buffer.from('fake-pdf-content'), 'lease-contract.pdf')
      .expect(201);

    expect(res.body.url).toBeDefined();
    expect(res.body.publicId).toBeDefined();
  });

  it('GET /api/v1/upload/presigned-url (Get Presigned Document URL)', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/upload/presigned-url?publicId=documents-12345.pdf')
      .set('Authorization', `Bearer ${userToken}`)
      .expect(200);

    expect(res.body.presignedUrl).toBeDefined();
    expect(res.body.presignedUrl).toContain('documents-12345.pdf');
  });
});
