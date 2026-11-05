import { BadRequestException, Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';

export interface PlatformLaboratoryAuditInput {
  laboratoryId: number;
  platformOwnerId: number;
  action: string;
  summary: string;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class PlatformLaboratoryAuditService {
  async write(manager: EntityManager, input: PlatformLaboratoryAuditInput): Promise<void> {
    if (
      !Number.isInteger(input?.laboratoryId) ||
      input.laboratoryId <= 0 ||
      !Number.isInteger(input?.platformOwnerId) ||
      input.platformOwnerId <= 0
    ) {
      throw new BadRequestException('PLATFORM_LABORATORY_AUDIT_ACTOR_OR_TENANT_INVALID');
    }
    if (
      typeof input.action !== 'string' ||
      !input.action.trim() ||
      input.action.trim().length > 120 ||
      typeof input.summary !== 'string' ||
      !input.summary.trim() ||
      input.summary.trim().length > 250
    ) {
      throw new BadRequestException('PLATFORM_LABORATORY_AUDIT_EVENT_INVALID');
    }

    await manager.query(
      `INSERT INTO platform_laboratory_audit_logs
        (laboratory_id,platform_owner_id,action,summary,metadata_json)
       VALUES ($1,$2,$3,$4,$5::jsonb)`,
      [
        input.laboratoryId,
        input.platformOwnerId,
        input.action.trim(),
        input.summary.trim(),
        JSON.stringify(input.metadata ?? {}),
      ],
    );
  }
}
