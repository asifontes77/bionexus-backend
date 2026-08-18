import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { resolveBootstrapConfig } from './bootstrap/bootstrap.config';
import { readFileSync } from 'fs';
import { BioNexusExceptionFilter } from './observability/bio-nexus-exception.filter';
import { BioNexusRequestLoggingInterceptor } from './observability/bio-nexus-request-logging.interceptor';

async function bootstrap() {
  try {
    const config = resolveBootstrapConfig(
      {
        HOST: process.env.HOST,
        PORT: process.env.PORT,
        CORS_ORIGINS: process.env.CORS_ORIGINS,
        HTTPS_ENABLED: process.env.HTTPS_ENABLED,
        TLS_KEY_PATH: process.env.TLS_KEY_PATH,
        TLS_CERT_PATH: process.env.TLS_CERT_PATH,
      },
      readFileSync,
    );

    const appOptions = config.httpsOptions
      ? { httpsOptions: config.httpsOptions }
      : {};

    const app = await NestFactory.create<NestExpressApplication>(
      AppModule,
      appOptions,
    );

    app.enableCors({
      origin: config.corsOrigins,
      methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
      allowedHeaders: 'Content-Type,Authorization,Accept',
      optionsSuccessStatus: 204,
    });

    app.setGlobalPrefix('api');

  app.useGlobalFilters(new BioNexusExceptionFilter());
  app.useGlobalInterceptors(new BioNexusRequestLoggingInterceptor());
    await app.listen(config.port, config.host);
  } catch {
    console.error('Failed to start application.');
    process.exitCode = 1;
  }
}

bootstrap();
