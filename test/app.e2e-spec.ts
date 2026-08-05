import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';

describe('AppController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('debe servir un archivo público mediante una ruta anidada', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/public/toro.svg')
      .expect(200);

    expect(response.headers['content-type']).toContain('image/svg+xml');
    expect(Buffer.from(response.body).toString('utf8')).toContain('<svg');
  });

  it('debe responder 404 para la raíz del prefijo API', async () => {
    await request(app.getHttpServer())
      .get('/api')
      .expect(404);
  });

  it('no debe servir contenido estático para una ruta API no registrada', async () => {
    await request(app.getHttpServer())
      .get('/api/ruta-no-registrada')
      .expect(404);
  });
});