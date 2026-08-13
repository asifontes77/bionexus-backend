import { ForbiddenException } from '@nestjs/common';

export interface SecurityAuthenticatedRequest {
  user?: {
    userId?: number;
    username?: string;
  };
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

  return actorUserId;
}
