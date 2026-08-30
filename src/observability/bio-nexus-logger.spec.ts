import { Logger } from '@nestjs/common';
import { BioNexusLogger } from './bio-nexus-logger';

describe('BioNexusLogger vertical format', () => {
  afterEach(() => jest.restoreAllMocks());

  it('muestra cada dato HTTP en su propia linea', () => {
    const warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    BioNexusLogger.warning('POST /api/users/session -> 401', 'UsersController.getUserSession', {
      durationMs: 140,
      code: 'INVALID_CREDENTIALS',
      requestId: 'request-401',
    });
    const output = String(warn.mock.calls[0][0]);
    expect(output).toBe([
      '[WARNING]',
      '    Caller: UsersController.getUserSession',
      '    Peticion: POST /api/users/session',
      '    Estado: 401',
      '    Duracion: 140 ms',
      '    Codigo: INVALID_CREDENTIALS',
      '    Solicitud: request-401',
    ].join('\n'));
  });

  it('oculta DEBUG de forma predeterminada', () => {
    const debug = jest.spyOn(Logger.prototype, 'debug').mockImplementation();
    delete process.env.BIONEXUS_LOG_LEVEL;
    BioNexusLogger.debug('Mensaje tecnico', 'SessionGateway', { socketId: 'socket-1' });
    expect(debug).not.toHaveBeenCalled();
  });
  it('muestra DEBUG vertical solo cuando se habilita expresamente', () => {
    const debug = jest.spyOn(Logger.prototype, 'debug').mockImplementation();
    process.env.BIONEXUS_LOG_LEVEL = 'DEBUG';
    try {
      BioNexusLogger.debug('Mensaje tecnico', 'SessionGateway', { socketId: 'socket-1' });
      const output = String(debug.mock.calls[0][0]);
      expect(output).toContain('[DEBUG]\n    Caller: SessionGateway\n    Mensaje: Mensaje tecnico');
      expect(output).toContain('\n    socketId: socket-1');
    } finally {
      delete process.env.BIONEXUS_LOG_LEVEL;
    }
  });  it('muestra bootstrap como propiedades verticales', () => {
    const log = jest.spyOn(Logger.prototype, 'log').mockImplementation();
    BioNexusLogger.success('Backend iniciado correctamente', 'Bootstrap', { host: '0.0.0.0', port: 3002, https: false });
    const output = String(log.mock.calls[0][0]);
    expect(output).toContain('[SUCCESS]\n    Caller: Bootstrap\n    Mensaje: Backend iniciado correctamente');
    expect(output).toContain('\n    Host: 0.0.0.0\n    Puerto: 3002\n    HTTPS: false');
  });
});

