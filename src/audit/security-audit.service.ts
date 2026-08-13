import {
  BadRequestException,
  Injectable,
} from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { SecurityAuditLog } from './security-audit-log.entity';
import { getSecurityAuditHttpContext } from './security-audit-context';

export interface SecurityAuditWrite {
  actorUserId: number;
  action: string;
  entityType: string;
  entityId?: number | string | null;
  summary: string;
  metadata?: Record<string, unknown> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

@Injectable()
export class SecurityAuditService {
  async write(
    manager: EntityManager,
    input: SecurityAuditWrite,
  ): Promise<void> {
    if (!manager) {
      throw new BadRequestException('AUDIT_MANAGER_REQUIRED');
    }

    if (
      !Number.isInteger(input?.actorUserId) ||
      input.actorUserId <= 0
    ) {
      throw new BadRequestException('AUDIT_ACTOR_INVALID');
    }

    const repository = manager.getRepository(SecurityAuditLog);
    const httpContext = getSecurityAuditHttpContext();
    const audit = repository.create({
      actorUserId: input.actorUserId,
      action: this.requiredText(
        input.action,
        120,
        'AUDIT_ACTION_INVALID',
      ),
      entityType: this.requiredText(
        input.entityType,
        80,
        'AUDIT_ENTITY_TYPE_INVALID',
      ),
      entityId:
        input.entityId === undefined || input.entityId === null
          ? null
          : String(input.entityId).slice(0, 100),
      outcome: 'success',
      summary: this.requiredText(
        input.summary,
        250,
        'AUDIT_SUMMARY_INVALID',
      ),
      metadata: this.sanitizeMetadata(input.metadata),
      ipAddress: this.optionalText(
        input.ipAddress ?? httpContext?.ipAddress,
        45,
      ),
      userAgent: this.optionalText(
        input.userAgent ?? httpContext?.userAgent,
        500,
      ),
    });

    await repository.save(audit);
  }

  private sanitizeMetadata(
    value: Record<string, unknown> | null | undefined,
  ): Record<string, unknown> | null {
    if (!value) return null;

    const forbidden =
      /(password|token|secret|signature|hash|key_signing|key_recover)/i;
    const sanitized: Record<string, unknown> = {};

    for (const [key, item] of Object.entries(value)) {
      if (forbidden.test(key)) continue;

      if (Array.isArray(item)) {
        sanitized[key] = item.slice(0, 100).map((entry) =>
          typeof entry === 'string'
            ? entry.slice(0, 200)
            : entry,
        );
      } else if (typeof item === 'string') {
        sanitized[key] = item.slice(0, 500);
      } else if (
        item === null ||
        typeof item === 'number' ||
        typeof item === 'boolean'
      ) {
        sanitized[key] = item;
      }
    }

    return Object.keys(sanitized).length === 0
      ? null
      : sanitized;
  }

  private requiredText(
    value: unknown,
    maximum: number,
    error: string,
  ): string {
    if (
      typeof value !== 'string' ||
      value.trim() === '' ||
      value.trim().length > maximum
    ) {
      throw new BadRequestException(error);
    }

    return value.trim();
  }

  private optionalText(
    value: unknown,
    maximum: number,
  ): string | null {
    if (typeof value !== 'string' || value.trim() === '') {
      return null;
    }

    return value.trim().slice(0, maximum);
  }
}
