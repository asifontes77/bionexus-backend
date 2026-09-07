import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { SecurityAuditService } from '../audit/security-audit.service';
import { CreateDollarvalueDto } from './dto/create-dollarvalue.dto';
import { Dollarvalue } from './dollarvalue.entity';

@Injectable()
export class DollarvalueService {
  constructor(
    @InjectRepository(Dollarvalue)
    private readonly repository: Repository<Dollarvalue>,
    private readonly dataSource: DataSource,
    private readonly audit: SecurityAuditService,
  ) {}

  async getCurrent(): Promise<Dollarvalue> {
    const record = await this.repository.findOne({ where: {}, order: { id: 'DESC' } });
    if (!record) throw new NotFoundException('DOLLAR_VALUE_NOT_FOUND');
    return record;
  }

  getHistory(): Promise<Dollarvalue[]> {
    return this.repository.find({ order: { id: 'DESC' }, take: 100 });
  }

  async publish(body: CreateDollarvalueDto, actorUserId?: number): Promise<Dollarvalue> {
    const value = this.normalizeValue(body);
    if (actorUserId === undefined) throw new BadRequestException('DOLLAR_VALUE_ACTOR_REQUIRED');

    return this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(Dollarvalue);
      const previous = await repository.findOne({ where: {}, order: { id: 'DESC' } });
      const saved = await repository.save(repository.create({ value, date: new Date() }));
      await this.writeAudit(manager, actorUserId, previous, saved);
      return saved;
    });
  }

  private normalizeValue(body: CreateDollarvalueDto): number {
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw new BadRequestException('DOLLAR_VALUE_BODY_REQUIRED');
    if (Object.keys(body).some((field) => field !== 'value')) throw new BadRequestException('DOLLAR_VALUE_FIELD_UNKNOWN');
    const value = Number(body.value);
    if (!Number.isFinite(value) || value <= 0) throw new BadRequestException('DOLLAR_VALUE_INVALID');
    const rounded = Math.round(value * 100) / 100;
    if (Math.abs(value - rounded) > Number.EPSILON) throw new BadRequestException('DOLLAR_VALUE_SCALE_INVALID');
    return rounded;
  }

  private async writeAudit(manager: EntityManager, actorUserId: number, previous: Dollarvalue | null, current: Dollarvalue): Promise<void> {
    await this.audit.write(manager, {
      actorUserId,
      action: 'dollar-value.published',
      entityType: 'dollar-value',
      entityId: current.id,
      summary: 'Valor del dolar publicado',
      metadata: {
        previousValue: previous?.value ?? null,
        previousDate: previous?.date?.toISOString?.() ?? null,
        currentValue: current.value,
        currentDate: current.date.toISOString(),
      },
    });
  }
}
