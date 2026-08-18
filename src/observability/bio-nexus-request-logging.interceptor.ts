import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { BioNexusLogger } from './bio-nexus-logger';

@Injectable()
export class BioNexusRequestLoggingInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<{ method: string; originalUrl: string; user?: { id?: number }; headers: Record<string, string | undefined> }>();
    const startedAt = Date.now();
    const requestId = request.headers['x-request-id'] ?? crypto.randomUUID();
    BioNexusLogger.info('Solicitud iniciada', 'HttpRequest', { requestId, method: request.method, path: request.originalUrl, userId: request.user?.id ?? null });
    return next.handle().pipe(tap({ next: () => BioNexusLogger.info('Solicitud completada', 'HttpRequest', { requestId, method: request.method, path: request.originalUrl, durationMs: Date.now() - startedAt }), error: (error) => BioNexusLogger.error(error, 'HttpRequest', { requestId, method: request.method, path: request.originalUrl, durationMs: Date.now() - startedAt }) }));
  }
}
