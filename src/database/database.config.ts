import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { join, resolve } from 'path';

export interface DatabaseEnvironment {
  DB_HOST?: string;
  DB_PORT?: string;
  DB_USER?: string;
  DB_PASSWORD?: string;
  DB_DATABASE?: string;
}

function resolveSrcDirectory(baseDirectory: string): string {
  return baseDirectory.split(/\\|\//).pop() === 'database' ? resolve(baseDirectory, '..') : baseDirectory;
}

export function resolveDatabaseOptions(
  environment: DatabaseEnvironment,
  baseDirectory: string
): TypeOrmModuleOptions {
  const missing: string[] = [];

  const getVar = (name: keyof DatabaseEnvironment, sensitive: boolean = false): string => {
    const value = environment[name];
    if (value === undefined || value === null || (typeof value === 'string' && value.trim() === '')) {
      missing.push(name);
      return '';
    }
    return sensitive ? value : value.trim();
  };

  const host = getVar('DB_HOST');
  const portStr = getVar('DB_PORT');
  const username = getVar('DB_USER');
  const password = getVar('DB_PASSWORD', true);
  const database = getVar('DB_DATABASE');

  if (missing.length > 0) {
    throw new Error(`Missing required database variables: ${missing.join(', ')}`);
  }

  const port = Number(portStr);
  if (!/^\d+$/.test(portStr) || isNaN(port) || port < 1 || port > 65535) {
    throw new Error(`Invalid value for DB_PORT`);
  }

  const srcDir = resolveSrcDirectory(baseDirectory);

  return {
    type: 'mysql',
    host,
    port,
    username,
    password,
    database,
    entities: [join(srcDir, '**', '*.entity.{ts,js}').replace(/\\/g, '/')],
    migrations: [join(srcDir, 'database', 'migrations', '*.{ts,js}').replace(/\\/g, '/')],
    synchronize: false,
    migrationsRun: false,
  };
}
