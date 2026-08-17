import { resolveDatabaseOptions, DatabaseEnvironment } from './database.config';
type MysqlConnectionOptions = {
  type: 'mysql';
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
  synchronize: boolean;
  migrationsRun: boolean;
  entities?: unknown[];
  migrations?: unknown[];
};
import { join } from 'path';

describe('Configuración de Base de Datos', () => {
  const baseEnvironment: DatabaseEnvironment = {
    DB_HOST: 'localhost',
    DB_PORT: '3306',
    DB_USER: 'test_user',
    DB_PASSWORD: 'test_password',
    DB_DATABASE: 'test_db',
  };

  it('debe devolver TypeOrmModuleOptions con configuración válida', () => {
    const options = resolveDatabaseOptions(
      baseEnvironment,
      '/app/src',
    ) as MysqlConnectionOptions;
    expect(options.type).toBe('mysql');
    expect(options.host).toBe('localhost');
    expect(options.port).toBe(3306);
    expect(options.username).toBe('test_user');
    expect(options.password).toBe('test_password');
    expect(options.database).toBe('test_db');
    expect(options.synchronize).toBe(false);
    expect(options.migrationsRun).toBe(false);
  });

  describe('Resolución de patrones', () => {
    it('debe resolver patrones desde un directorio src', () => {
      const options = resolveDatabaseOptions(
        baseEnvironment,
        '/app/src',
      ) as MysqlConnectionOptions;
      const entities = options.entities as string[];
      const migrations = options.migrations as string[];
      expect(entities[0]).toContain('**/*.entity.{ts,js}');
      expect(migrations[0]).toContain('/database/migrations/*.{ts,js}');
    });

    it('debe resolver patrones correctamente desde src/database', () => {
      const options = resolveDatabaseOptions(
        baseEnvironment,
        join('/app/src', 'database'),
      ) as MysqlConnectionOptions;
      const entities = options.entities as string[];
      const migrations = options.migrations as string[];

      expect(migrations[0]).not.toContain('/database/database/migrations');
      expect(entities[0]).toContain('**/*.entity.{ts,js}');
      expect(migrations[0]).toContain('/database/migrations/*.{ts,js}');
    });
  });

  describe('Variables ausentes', () => {
    const variables: (keyof DatabaseEnvironment)[] = [
      'DB_HOST',
      'DB_PORT',
      'DB_USER',
      'DB_PASSWORD',
      'DB_DATABASE',
    ];

    it.each(variables)(
      'debe lanzar error cuando %s es undefined',
      (variable) => {
        const env = { ...baseEnvironment, [variable]: undefined };
        expect(() => resolveDatabaseOptions(env, '/app/src')).toThrow(variable);
      },
    );

    it.each(variables)(
      'debe lanzar error cuando %s tiene solo espacios',
      (variable) => {
        const env = { ...baseEnvironment, [variable]: '   ' };
        expect(() => resolveDatabaseOptions(env, '/app/src')).toThrow(variable);
      },
    );
  });

  describe('Validación de DB_PORT', () => {
    const invalidPorts = ['texto', '12.5', '0', '65536', '3306abc'];

    it.each(invalidPorts)(
      'debe lanzar error cuando DB_PORT es %s',
      (invalidPort) => {
        const env = { ...baseEnvironment, DB_PORT: invalidPort };
        expect(() => resolveDatabaseOptions(env, '/app/src')).toThrow(
          'DB_PORT',
        );
      },
    );
  });

  it('debe conservar la contraseña con espacios externos', () => {
    const env = { ...baseEnvironment, DB_PASSWORD: ' secret value ' };
    const options = resolveDatabaseOptions(
      env,
      '/app/src',
    ) as MysqlConnectionOptions;
    expect(options.password).toBe(' secret value ');
  });

  it('no debe incluir la contraseña en los mensajes de error', () => {
    const secretPassword = 'my_super_secret_password';
    const env = {
      ...baseEnvironment,
      DB_HOST: undefined,
      DB_PASSWORD: secretPassword,
    };
    try {
      resolveDatabaseOptions(env, '/app/src');
    } catch (error: unknown) {
      if (error instanceof Error) {
        expect(error.message).not.toContain(secretPassword);
      } else {
        throw error;
      }
    }
  });
});
