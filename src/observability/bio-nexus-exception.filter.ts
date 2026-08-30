import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response } from 'express';
import { BioNexusLogger } from './bio-nexus-logger';
import { BioNexusObservedRequest } from './bio-nexus-request-logging.interceptor';

@Catch()
export class BioNexusExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const request = http.getRequest<Request & BioNexusObservedRequest>();
    const response = http.getResponse<Response>();
    const status = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const requestId = request.bioNexusRequestId ?? crypto.randomUUID();
    const code = this.getPublicMessage(exception);
    const source = this.getSource(request);
    const metadata = { durationMs: request.bioNexusStartedAt ? Date.now() - request.bioNexusStartedAt : undefined, requestId, userId: request.user?.userId ?? request.user?.id ?? null, code };
    const summary = `${request.method} ${request.originalUrl} -> ${status}`;
    if (status >= 500) BioNexusLogger.error(exception, source, { ...metadata, summary });
    else BioNexusLogger.warning(summary, source, metadata);
    const publicMessage = status >= 500 ? 'Ocurrio un error interno. Consulte la consola del Backend con el identificador de solicitud.' : code;
    response.setHeader('X-Request-Id', requestId);
    response.status(status).json({ statusCode: status, message: publicMessage, requestId, timestamp: new Date().toISOString(), technicalCode: status >= 500 ? 'BIO_NEXUS_INTERNAL_ERROR' : undefined });
  }

  private getSource(request: Request & BioNexusObservedRequest): string {
    return request.bioNexusSource || 'HttpRequest';
  }

  private getPublicMessage(exception: unknown): string {
    if (!(exception instanceof HttpException)) return 'Solicitud no procesada.';
    const body = exception.getResponse();
    if (typeof body === 'string') return body;
    if (body && typeof body === 'object' && 'message' in body) {
      const message = (body as { message?: string | string[] }).message;
      return Array.isArray(message) ? message.join(', ') : message || exception.message;
    }
    return exception.message;
  }
}
