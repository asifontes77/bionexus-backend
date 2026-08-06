export interface BootstrapEnvironment {
  HOST?: string;
  PORT?: string;
  CORS_ORIGINS?: string;
  HTTPS_ENABLED?: string;
  TLS_KEY_PATH?: string;
  TLS_CERT_PATH?: string;
}

export interface BootstrapConfig {
  host: string;
  port: number;
  corsOrigins: string[];
  httpsOptions?: {
    key: Buffer;
    cert: Buffer;
  };
}

export type FileReader = (path: string) => Buffer;

export function resolveBootstrapConfig(
  environment: BootstrapEnvironment,
  readFile: FileReader,
): BootstrapConfig {
  const host = environment.HOST || '0.0.0.0';

  const rawPort = environment.PORT || '3000';
  const port = Number(rawPort);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT must be an integer between 1 and 65535.');
  }

  const rawCorsOrigins = environment.CORS_ORIGINS || 'http://localhost:8080';
  const corsOrigins = rawCorsOrigins
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);

  const uniqueCorsOrigins = [...new Set(corsOrigins)];

  const rawHttpsEnabled =
    environment.HTTPS_ENABLED?.trim().toLowerCase() || 'false';
  let httpsEnabled = false;

  if (rawHttpsEnabled === 'true') {
    httpsEnabled = true;
  } else if (rawHttpsEnabled !== 'false') {
    throw new Error('HTTPS_ENABLED must be either "true" or "false".');
  }

  let httpsOptions: BootstrapConfig['httpsOptions'];

  if (httpsEnabled) {
    if (!environment.TLS_KEY_PATH) {
      throw new Error('TLS_KEY_PATH is required when HTTPS_ENABLED is true.');
    }
    if (!environment.TLS_CERT_PATH) {
      throw new Error('TLS_CERT_PATH is required when HTTPS_ENABLED is true.');
    }
    httpsOptions = {
      key: readFile(environment.TLS_KEY_PATH),
      cert: readFile(environment.TLS_CERT_PATH),
    };
  }

  return {
    host,
    port,
    corsOrigins: uniqueCorsOrigins,
    httpsOptions,
  };
}
