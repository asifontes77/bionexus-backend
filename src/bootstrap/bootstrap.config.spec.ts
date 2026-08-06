import {
  resolveBootstrapConfig,
  BootstrapEnvironment,
} from './bootstrap.config';

describe('resolveBootstrapConfig', () => {
  it('usa valores predeterminados correctos HTTP', () => {
    const env: BootstrapEnvironment = {};
    const readFileMock = jest.fn();

    const config = resolveBootstrapConfig(env, readFileMock);

    expect(config.host).toEqual('0.0.0.0');
    expect(config.port).toEqual(3000);
    expect(config.corsOrigins).toEqual(['http://localhost:8080']);
    expect(config.httpsOptions).toBeUndefined();
    expect(readFileMock).not.toHaveBeenCalled();
  });

  it('usa valores configurados HTTP correctamente', () => {
    const env: BootstrapEnvironment = {
      HOST: '127.0.0.1',
      PORT: '4000',
      CORS_ORIGINS: 'http://localhost:4200, http://test.com , http://test.com',
    };
    const readFileMock = jest.fn();

    const config = resolveBootstrapConfig(env, readFileMock);

    expect(config.host).toEqual('127.0.0.1');
    expect(config.port).toEqual(4000);
    expect(config.corsOrigins).toEqual([
      'http://localhost:4200',
      'http://test.com',
    ]);
  });

  describe('PORT inválido', () => {
    it('falla con texto no numérico', () => {
      const env: BootstrapEnvironment = { PORT: 'abc' };
      expect(() => resolveBootstrapConfig(env, jest.fn())).toThrow(
        'PORT must be an integer between 1 and 65535.',
      );
    });

    it('falla con cero', () => {
      const env: BootstrapEnvironment = { PORT: '0' };
      expect(() => resolveBootstrapConfig(env, jest.fn())).toThrow(
        'PORT must be an integer between 1 and 65535.',
      );
    });

    it('falla con 3000abc', () => {
      const env: BootstrapEnvironment = { PORT: '3000abc' };
      expect(() => resolveBootstrapConfig(env, jest.fn())).toThrow(
        'PORT must be an integer between 1 and 65535.',
      );
    });

    it('falla con 12.5', () => {
      const env: BootstrapEnvironment = { PORT: '12.5' };
      expect(() => resolveBootstrapConfig(env, jest.fn())).toThrow(
        'PORT must be an integer between 1 and 65535.',
      );
    });

    it('falla mayor a 65535', () => {
      const env: BootstrapEnvironment = { PORT: '65536' };
      expect(() => resolveBootstrapConfig(env, jest.fn())).toThrow(
        'PORT must be an integer between 1 and 65535.',
      );
    });
  });

  it('falla con HTTPS_ENABLED inválido', () => {
    const env: BootstrapEnvironment = { HTTPS_ENABLED: 'yes' };
    expect(() => resolveBootstrapConfig(env, jest.fn())).toThrow(
      'HTTPS_ENABLED must be either "true" or "false".',
    );
  });

  it('HTTPS_ENABLED en FALSE con espacios desactiva HTTPS', () => {
    const env: BootstrapEnvironment = { HTTPS_ENABLED: ' FALSE ' };
    const readFileMock = jest.fn();
    const config = resolveBootstrapConfig(env, readFileMock);
    expect(config.httpsOptions).toBeUndefined();
    expect(readFileMock).not.toHaveBeenCalled();
  });

  it('HTTPS_ENABLED en TRUE con espacios acepta y configura HTTPS', () => {
    const env: BootstrapEnvironment = {
      HTTPS_ENABLED: ' TRUE ',
      TLS_KEY_PATH: 'test.key',
      TLS_CERT_PATH: 'test.crt',
    };
    const mockKeyBuffer = Buffer.from('key_data');
    const mockCertBuffer = Buffer.from('cert_data');
    const readFileMock = jest.fn((path) => {
      if (path === 'test.key') return mockKeyBuffer;
      if (path === 'test.crt') return mockCertBuffer;
      return Buffer.from('');
    });

    const config = resolveBootstrapConfig(env, readFileMock);

    expect(readFileMock).toHaveBeenCalledTimes(2);
    expect(config.httpsOptions?.key).toEqual(mockKeyBuffer);
    expect(config.httpsOptions?.cert).toEqual(mockCertBuffer);
  });

  it('falla cuando HTTPS está habilitado pero TLS_KEY_PATH no existe', () => {
    const env: BootstrapEnvironment = {
      HTTPS_ENABLED: 'true',
      TLS_CERT_PATH: 'cert.crt',
    };
    expect(() => resolveBootstrapConfig(env, jest.fn())).toThrow(
      'TLS_KEY_PATH is required when HTTPS_ENABLED is true.',
    );
  });

  it('falla cuando HTTPS está habilitado pero TLS_CERT_PATH no existe', () => {
    const env: BootstrapEnvironment = {
      HTTPS_ENABLED: 'true',
      TLS_KEY_PATH: 'key.pem',
    };
    expect(() => resolveBootstrapConfig(env, jest.fn())).toThrow(
      'TLS_CERT_PATH is required when HTTPS_ENABLED is true.',
    );
  });

  it('configura opciones HTTPS adecuadamente', () => {
    const env: BootstrapEnvironment = {
      HTTPS_ENABLED: 'true',
      TLS_KEY_PATH: 'test.key',
      TLS_CERT_PATH: 'test.crt',
    };
    const mockKeyBuffer = Buffer.from('key_data');
    const mockCertBuffer = Buffer.from('cert_data');

    const readFileMock = jest.fn((path) => {
      if (path === 'test.key') return mockKeyBuffer;
      if (path === 'test.crt') return mockCertBuffer;
      return Buffer.from('');
    });

    const config = resolveBootstrapConfig(env, readFileMock);

    expect(readFileMock).toHaveBeenCalledTimes(2);
    expect(readFileMock).toHaveBeenCalledWith('test.key');
    expect(readFileMock).toHaveBeenCalledWith('test.crt');
    expect(config.httpsOptions?.key).toEqual(mockKeyBuffer);
    expect(config.httpsOptions?.cert).toEqual(mockCertBuffer);
  });
});
