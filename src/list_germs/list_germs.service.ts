import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { SecurityAuditService } from '../audit/security-audit.service';
import { CreateListGermsDto } from './dto/create-list_germs.dto';
import { UpdateListGermsDto } from './dto/update-list_germs.dto';
import { listGerms } from './list_germs.entity';

@Injectable()
export class ListGermsService {
  constructor(
    @InjectRepository(listGerms)
    private readonly list_germsRepository: Repository<listGerms>,
    @Optional() private readonly dataSource?: DataSource,
    @Optional() private readonly securityAuditService?: SecurityAuditService,
  ) {}

  async getListGermsLists(): Promise<listGerms[]> {
    return this.list_germsRepository.find({
      order: {
        germen: 'ASC',
      },
    });
  }

  async getListGermsListsOrder(): Promise<listGerms[]> {
    return this.list_germsRepository.find({
      where: {
        annulled: false,
      },
      order: {
        germen: 'ASC',
      },
    });
  }

  async getListGerms(id: number): Promise<listGerms> {
    this.validateId(id);

    const listGerm = await this.list_germsRepository.findOne({
      where: {
        id,
      },
    });

    if (!listGerm) {
      throw new NotFoundException('GERM_NOT_FOUND');
    }

    return listGerm;
  }

  async createListGerms(
    body: CreateListGermsDto,
    actorUserId?: number,
  ): Promise<listGerms> {
    const germen = this.normalizeGermen(body?.germen);
    await this.ensureGermenAvailable(this.list_germsRepository, germen);

    if (actorUserId === undefined) {
      const listGerm = this.list_germsRepository.create({
        germen,
        annulled: false,
      });
      return this.saveListGerm(this.list_germsRepository, listGerm);
    }

    if (!this.dataSource) {
      throw new Error('GERM_TRANSACTION_UNAVAILABLE');
    }

    return this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(listGerms);
      const listGerm = repository.create({
        germen,
        annulled: false,
      });
      const saved = await this.saveListGerm(repository, listGerm);
      await this.writeAudit(manager, actorUserId, {
        action: 'germ.created',
        entityId: saved.id,
        summary: 'Forma parasitaria creada',
        metadata: {
          germen: saved.germen,
          annulled: saved.annulled,
        },
      });
      return saved;
    });
  }

  async updateListGerms(
    id: number,
    body: UpdateListGermsDto,
    actorUserId?: number,
  ): Promise<listGerms> {
    this.validateId(id);

    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      throw new BadRequestException('GERM_UPDATE_REQUIRED');
    }

    const hasGermen = Object.prototype.hasOwnProperty.call(
      body,
      'germen',
    );
    const hasAnnulled = Object.prototype.hasOwnProperty.call(body, 'annulled');

    if (!hasGermen && !hasAnnulled) {
      throw new BadRequestException('GERM_UPDATE_REQUIRED');
    }

    if (actorUserId === undefined) {
      return this.updateWithRepository(
        this.list_germsRepository,
        id,
        body,
        hasGermen,
        hasAnnulled,
      );
    }

    if (!this.dataSource) {
      throw new Error('GERM_TRANSACTION_UNAVAILABLE');
    }

    return this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(listGerms);
      const existing = await repository.findOne({ where: { id } });
      if (!existing) {
        throw new NotFoundException('GERM_NOT_FOUND');
      }

      const previousGermen = existing.germen;
      const previousAnnulled = Boolean(existing.annulled);
      const saved = await this.updateWithRepository(
        repository,
        id,
        body,
        hasGermen,
        hasAnnulled,
        existing,
      );
      const currentAnnulled = Boolean(saved.annulled);
      const action = hasAnnulled && previousAnnulled !== currentAnnulled
        ? currentAnnulled
          ? 'germ.deactivated'
          : 'germ.activated'
        : 'germ.updated';
      const summary = action === 'germ.deactivated'
        ? 'Forma parasitaria inactivada'
        : action === 'germ.activated'
          ? 'Forma parasitaria activada'
          : 'Forma parasitaria actualizada';

      await this.writeAudit(manager, actorUserId, {
        action,
        entityId: saved.id,
        summary,
        metadata: {
          germen: saved.germen,
          previousGermen,
          previousAnnulled,
          annulled: currentAnnulled,
          changedFields: [
            ...(hasGermen ? ['germen'] : []),
            ...(hasAnnulled ? ['annulled'] : []),
          ],
        },
      });
      return saved;
    });
  }

  private async updateWithRepository(
    repository: Repository<listGerms>,
    id: number,
    body: UpdateListGermsDto,
    hasGermen: boolean,
    hasAnnulled: boolean,
    existing?: listGerms,
  ): Promise<listGerms> {
    const listGerm = existing ?? await repository.findOne({
      where: { id },
    });
    if (!listGerm) {
      throw new NotFoundException('GERM_NOT_FOUND');
    }
    if (hasGermen) {
      const germen = this.normalizeGermen(body.germen);
      await this.ensureGermenAvailable(repository, germen, id);
      listGerm.germen = germen;
    }
    if (hasAnnulled) {
      if (typeof body.annulled !== 'boolean') {
        throw new BadRequestException('GERM_ANNULLED_INVALID');
      }
      listGerm.annulled = body.annulled;
    }
    return this.saveListGerm(repository, listGerm);
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
      entityType: 'germ',
      ...input,
    });
  }

  private validateId(id: number): void {
    if (!Number.isInteger(id) || id <= 0) {
      throw new BadRequestException('GERM_ID_INVALID');
    }
  }

  private async ensureGermenAvailable(
    repository: Repository<listGerms>,
    germen: string,
    excludedId?: number,
  ): Promise<void> {
    const duplicate = await repository
      .createQueryBuilder('listGerm')
      .where('LOWER(TRIM(listGerm.germen)) = LOWER(:germen)', { germen })
      .andWhere(excludedId === undefined ? '1 = 1' : 'listGerm.id <> :excludedId', { excludedId })
      .getOne();
    if (duplicate) {
      throw new ConflictException('GERM_GERMEN_ALREADY_EXISTS');
    }
  }
  private async saveListGerm(
    repository: Repository<listGerms>,
    listGerm: listGerms,
  ): Promise<listGerms> {
    try {
      return await repository.save(listGerm);
    } catch (error) {
      const driverError = error && typeof error === 'object' && 'driverError' in error
        ? error.driverError as { code?: string }
        : undefined;
      if (driverError?.code === 'ER_DUP_ENTRY') {
        throw new ConflictException('GERM_GERMEN_ALREADY_EXISTS');
      }
      throw error;
    }
  }
  private normalizeGermen(germen: unknown): string {
    if (typeof germen !== 'string') {
      throw new BadRequestException('GERM_GERMEN_REQUIRED');
    }

    const normalizedGermen = germen.trim();

    if (normalizedGermen === '') {
      throw new BadRequestException('GERM_GERMEN_REQUIRED');
    }

    if (normalizedGermen.length > 50) {
      throw new BadRequestException('GERM_GERMEN_TOO_LONG');
    }

    return normalizedGermen;
  }
}
