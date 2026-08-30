import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Response } from 'express';
import { Observable } from 'rxjs';

export interface BioNexusObservedRequest {
  method: string;
  originalUrl: string;
  user?: { id?: number; userId?: number };
  headers: Record<string, string | string[] | undefined>;
  bioNexusRequestId?: string;
  bioNexusStartedAt?: number;
  bioNexusSource?: string;
}

@Injectable()
export class BioNexusRequestLoggingInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const request = http.getRequest<BioNexusObservedRequest>();
    const response = http.getResponse<Response>();
    const supplied = request.headers['x-request-id'];
    const requestId = (Array.isArray(supplied) ? supplied[0] : supplied)?.trim() || crypto.randomUUID();
    request.bioNexusRequestId = requestId;
    request.bioNexusStartedAt = Date.now();
    response.setHeader('X-Request-Id', requestId);
    const source = `${context.getClass().name}.${context.getHandler().name}`;
    request.bioNexusSource = source;
    return next.handle();
  }
}
