import {
  BadRequestException,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { SecurityAuditService } from '../audit/security-audit.service';
import { CreateParasiticformsDto } from './dto/create-parasiticforms.dto';
import { UpdateParasiticformsDto } from './dto/update-parasiticforms.dto';
import { Parasiticforms } from './parasiticforms.entity';

@Injectable()
export class ParasiticformsService {
  constructor(
    @InjectRepository(Parasiticforms)
    private readonly parasiticformsRepository: Repository<Parasiticforms>,
    @Optional() private readonly dataSource?: DataSource,
    @Optional() private readonly securityAuditService?: SecurityAuditService,
  ) {}

  async getParasiticformsLists(): Promise<Parasiticforms[]> {
    return this.parasiticformsRepository.find({
      order: {
        description: 'ASC',
      },
    });
  }

  async getParasiticformsListsOrder(): Promise<Parasiticforms[]> {
    return this.parasiticformsRepository.find({
      where: {
        annulled: false,
      },
      order: {
        description: 'ASC',
      },
    });
  }

  async getParasiticforms(id: number): Promise<Parasiticforms> {
    this.validateId(id);

    const parasiticform = await this.parasiticformsRepository.findOne({
      where: {
        id,
      },
    });

    if (!parasiticform) {
      throw new NotFoundException('PARASITICFORM_NOT_FOUND');
    }

    return parasiticform;
  }

  async createParasiticforms(
    body: CreateParasiticformsDto,
    actorUserId?: number,
  ): Promise<Parasiticforms> {
    const description = this.normalizeDescription(body?.description);

    if (actorUserId === undefined) {
      const parasiticform = this.parasiticformsRepository.create({
        description,
        annulled: false,
      });
      return this.parasiticformsRepository.save(parasiticform);
    }

    if (!this.dataSource) {
      throw new Error('PARASITICFORM_TRANSACTION_UNAVAILABLE');
    }

    return this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(Parasiticforms);
      const parasiticform = repository.create({
        description,
        annulled: false,
      });
      const saved = await repository.save(parasiticform);
      await this.writeAudit(manager, actorUserId, {
        action: 'parasiticforms.created',
        entityId: saved.id,
        summary: 'Forma parasitaria creada',
        metadata: {
          description: saved.description,
          annulled: saved.annulled,
        },
      });
      return saved;
    });
  }

  async updateParasiticforms(
    id: number,
    body: UpdateParasiticformsDto,
    actorUserId?: number,
  ): Promise<Parasiticforms> {
    this.validateId(id);

    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      throw new BadRequestException('PARASITICFORM_UPDATE_REQUIRED');
    }

    const hasDescription = Object.prototype.hasOwnProperty.call(
      body,
      'description',
    );
    const hasAnnulled = Object.prototype.hasOwnProperty.call(body, 'annulled');

    if (!hasDescription && !hasAnnulled) {
      throw new BadRequestException('PARASITICFORM_UPDATE_REQUIRED');
    }

    if (actorUserId === undefined) {
      return this.updateWithRepository(
        this.parasiticformsRepository,
        id,
        body,
        hasDescription,
        hasAnnulled,
      );
    }

    if (!this.dataSource) {
      throw new Error('PARASITICFORM_TRANSACTION_UNAVAILABLE');
    }

    return this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(Parasiticforms);
      const existing = await repository.findOne({ where: { id } });
      if (!existing) {
        throw new NotFoundException('PARASITICFORM_NOT_FOUND');
      }

      const previousDescription = existing.description;
      const previousAnnulled = Boolean(existing.annulled);
      const saved = await this.updateWithRepository(
        repository,
        id,
        body,
        hasDescription,
        hasAnnulled,
        existing,
      );
      const currentAnnulled = Boolean(saved.annulled);
      const action = hasAnnulled && previousAnnulled !== currentAnnulled
        ? currentAnnulled
          ? 'parasiticforms.deactivated'
          : 'parasiticforms.activated'
        : 'parasiticforms.updated';
      const summary = action === 'parasiticforms.deactivated'
        ? 'Forma parasitaria inactivada'
        : action === 'parasiticforms.activated'
          ? 'Forma parasitaria activada'
          : 'Forma parasitaria actualizada';

      await this.writeAudit(manager, actorUserId, {
        action,
        entityId: saved.id,
        summary,
        metadata: {
          description: saved.description,
          previousDescription,
          previousAnnulled,
          annulled: currentAnnulled,
          changedFields: [
            ...(hasDescription ? ['description'] : []),
            ...(hasAnnulled ? ['annulled'] : []),
          ],
        },
      });
      return saved;
    });
  }

  private async updateWithRepository(
    repository: Repository<Parasiticforms>,
    id: number,
    body: UpdateParasiticformsDto,
    hasDescription: boolean,
    hasAnnulled: boolean,
    existing?: Parasiticforms,
  ): Promise<Parasiticforms> {
    const parasiticform = existing ?? await repository.findOne({
      where: { id },
    });
    if (!parasiticform) {
      throw new NotFoundException('PARASITICFORM_NOT_FOUND');
    }
    if (hasDescription) {
      parasiticform.description = this.normalizeDescription(body.description);
    }
    if (hasAnnulled) {
      if (typeof body.annulled !== 'boolean') {
        throw new BadRequestException('PARASITICFORM_ANNULLED_INVALID');
      }
      parasiticform.annulled = body.annulled;
    }
    return repository.save(parasiticform);
  }

  private async writeAudit(
    manager: EntityManager,
    actorUserId: number,
    input: {
      action: string;
      entityId: number;
      summary: string;
      metadata: Record<string, unknown>;
    },
  ): Promise<void> {
    if (!this.securityAuditService) {
      throw new Error('SECURITY_AUDIT_SERVICE_UNAVAILABLE');
    }
    await this.securityAuditService.write(manager, {
      actorUserId,
      entityType: 'parasiticform',
      ...input,
    });
  }

  private validateId(id: number): void {
    if (!Number.isInteger(id) || id <= 0) {
      throw new BadRequestException('PARASITICFORM_ID_INVALID');
    }
  }

  private normalizeDescription(description: unknown): string {
    if (typeof description !== 'string') {
      throw new BadRequestException('PARASITICFORM_DESCRIPTION_REQUIRED');
    }

    const normalizedDescription = description.trim();

    if (normalizedDescription === '') {
      throw new BadRequestException('PARASITICFORM_DESCRIPTION_REQUIRED');
    }

    if (normalizedDescription.length > 50) {
      throw new BadRequestException('PARASITICFORM_DESCRIPTION_TOO_LONG');
    }

    return normalizedDescription;
  }
}
