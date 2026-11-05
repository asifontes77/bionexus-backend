import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { SubscriptionAccessService } from '../subscription/subscription-access.service';
import { SecurityModule } from './security.module';

describe('SecurityModule', () => {
  let module: TestingModule;
  let jwtService: JwtService;

  beforeAll(async () => {
    const builder = Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          ignoreEnvFile: true,
          ignoreEnvVars: true,
          load: [
            () => ({
              SECRET: 'test-secret',
            }),
          ],
        }),
        SecurityModule,
      ],
    });
    module = await builder
      .overrideProvider(SubscriptionAccessService)
      .useValue({ assertTenantCanAccess: jest.fn() })
      .compile();

    jwtService = module.get<JwtService>(JwtService);
  });

  afterAll(async () => {
    if (module) {
      await module.close();
    }
  });

  it('debe firmar y verificar un payload correctamente', () => {
    const payload = { id: 1, name: 'TestUser' };

    const token = jwtService.sign(payload);
    expect(token).toBeDefined();

    const decoded = jwtService.verify(token);
    expect(decoded.id).toEqual(payload.id);
    expect(decoded.name).toEqual(payload.name);
  });

  it('debe fallar si SECRET no está configurada', async () => {
    const builder = Test.createTestingModule({
        imports: [
          ConfigModule.forRoot({
            ignoreEnvFile: true,
            ignoreEnvVars: true,
          }),
          SecurityModule,
        ],
      });
    await expect(
      builder
        .overrideProvider(SubscriptionAccessService)
        .useValue({ assertTenantCanAccess: jest.fn() })
        .compile(),
    ).rejects.toThrow('The SECRET environment variable is required.');
  });
});
