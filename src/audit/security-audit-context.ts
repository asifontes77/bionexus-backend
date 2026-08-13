import { ForbiddenException } from '@nestjs/common';
import { AsyncLocalStorage } from 'async_hooks';

export interface SecurityAuthenticatedRequest {
  user?: {
    userId?: number;
    username?: string;
  };
  ip?: string;
  ips?: string[];
  headers?: Record<string, string | string[] | undefined>;
}


export interface SecurityAuditHttpContext {
  ipAddress: string | null;
  userAgent: string | null;
}

const securityAuditHttpStorage =
  new AsyncLocalStorage<SecurityAuditHttpContext>();

export function getSecurityAuditHttpContext():
SecurityAuditHttpContext | undefined {
  return securityAuditHttpStorage.getStore();
}

function captureSecurityAuditHttpContext(
  request: SecurityAuthenticatedRequest,
): void {
  const forwardedFor = request.headers?.['x-forwarded-for'];
  const forwardedIp = Array.isArray(forwardedFor)
    ? forwardedFor[0]
    : forwardedFor?.split(',')[0];
  const ipAddress = (
    forwardedIp ||
    request.ip ||
    request.ips?.[0] ||
    ''
  ).trim().slice(0, 45) || null;
  const userAgentHeader = request.headers?.['user-agent'];
  const userAgentValue = Array.isArray(userAgentHeader)
    ? userAgentHeader[0]
    : userAgentHeader;
  const userAgent = userAgentValue?.trim().slice(0, 500) || null;

  securityAuditHttpStorage.enterWith({
    ipAddress,
    userAgent,
  });
}

export function getSecurityAuditActorUserId(
  request: SecurityAuthenticatedRequest | undefined,
): number | null {
  if (request === undefined) return null;

  const actorUserId = request.user?.userId;
  if (
    actorUserId === undefined ||
    !Number.isInteger(actorUserId) ||
    actorUserId <= 0
  ) {
    throw new ForbiddenException('AUDIT_ACTOR_UNAVAILABLE');
  }

  captureSecurityAuditHttpContext(request);
  return actorUserId;
}
