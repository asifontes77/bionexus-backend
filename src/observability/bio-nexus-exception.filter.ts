import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response } from 'express';
import { BioNexusLogger } from './bio-nexus-logger';

@Catch()
export class BioNexusExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const request = http.getRequest<Request & { user?: { id?: number } }>();
    const response = http.getResponse<Response>();
    const status = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const requestId = request.headers['x-request-id']?.toString() ?? crypto.randomUUID();
    const technicalMessage = BioNexusLogger.error(exception, 'HttpException', { requestId, method: request.method, path: request.originalUrl, status, userId: request.user?.id ?? null });
    const publicMessage = status >= 500 ? 'Ocurrio un error interno. Consulte la consola del Backend con el identificador de solicitud.' : this.getPublicMessage(exception);
    response.status(status).json({ statusCode: status, message: publicMessage, requestId, timestamp: new Date().toISOString(), technicalCode: status >= 500 ? 'BIO_NEXUS_INTERNAL_ERROR' : undefined });
    if (status >= 500) BioNexusLogger.debug(technicalMessage, 'HttpExceptionDetail', { requestId });
  }

  private getPublicMessage(exception: unknown): string {
    if (!(exception instanceof HttpException)) return 'Solicitud no procesada.';
    const body = exception.getResponse();
    if (typeof body === 'string') return body;
    if (body && typeof body === 'object' && 'message' in body) {
      const message = (body as { message?: string | string[] }).message;
      return Array.isArray(message) ? message.join('. ') : message ?? exception.message;
    }
    return exception.message;
  }
}
