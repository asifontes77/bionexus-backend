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
import { Grouphtitems } from '../group_ht_items/group_ht_items.entity';
import { CreateGroup_htDto } from './dto/create-group_ht.dto';
import { UpdateGroup_htDto } from './dto/update-group_ht.dto';
import { Groupht } from './group_ht.entity';
@Injectable()
export class GroupHtService {
  constructor(
    @InjectRepository(Groupht) private readonly repository: Repository<Groupht>,
    @InjectRepository(Grouphtitems)
    private readonly items: Repository<Grouphtitems>,
    @Optional() private readonly dataSource?: DataSource,
    @Optional() private readonly audit?: SecurityAuditService,
  ) {}
  getGroupHtList() {
    return this.repository.find({ order: { description: 'ASC', id: 'ASC' } });
  }
  getGroupHtListActive() {
    return this.repository.find({
      where: { annulled: false },
      relations: { grouphtitems: true },
      order: { description: 'ASC', id: 'ASC' },
    });
  }
  async getGroupHt(id: number) {
    this.id(id);
    const row = await this.repository.findOne({
      where: { id },
      relations: { grouphtitems: true },
    });
    if (!row) throw new NotFoundException('WORKSHEET_GROUP_NOT_FOUND');
    return row;
  }
  countWithLike(description: string) {
    const d = this.description(description);
    return this.repository
      .createQueryBuilder('g')
      .where('LOWER(g.description) LIKE LOWER(:d)', { d: `%${d}%` })
      .getCount();
  }
  async createGroupHt(body: CreateGroup_htDto, actor?: number) {
    this.ready(actor);
    const description = this.description(body?.description),
      details = this.details(body?.details),
      annulled = this.bool(body?.annulled ?? false);
    return this.dataSource!.transaction(async (m) => {
      const r = m.getRepository(Groupht);
      await this.unique(r, description);
      const row = await r.save(r.create({ description, details, annulled }));
      await this.log(m, actor!, 'worksheet-group.created', row, [
        'description',
        'details',
        'annulled',
      ]);
      return row;
    });
  }
  async updateGroupHt(id: number, body: UpdateGroup_htDto, actor?: number) {
    this.id(id);
    this.ready(actor);
    const fields = this.fields(body);
    if (!fields.length)
      throw new BadRequestException('WORKSHEET_GROUP_UPDATE_REQUIRED');
    return this.dataSource!.transaction(async (m) => {
      const r = m.getRepository(Groupht),
        row = await r.findOne({ where: { id } });
      if (!row) throw new NotFoundException('WORKSHEET_GROUP_NOT_FOUND');
      const previous = {
        description: row.description,
        details: row.details,
        annulled: row.annulled,
      };
      if (Object.prototype.hasOwnProperty.call(body, 'description')) {
        const d = this.description(body.description);
        await this.unique(r, d, id);
        row.description = d;
      }
      if (Object.prototype.hasOwnProperty.call(body, 'details'))
        row.details = this.details(body.details);
      if (Object.prototype.hasOwnProperty.call(body, 'annulled'))
        row.annulled = this.bool(body.annulled);
      const saved = await r.save(row);
      await this.log(
        m,
        actor!,
        'worksheet-group.updated',
        saved,
        fields,
        previous,
      );
      return saved;
    });
  }
  async deleteGroupHt(id: number, actor?: number) {
    this.id(id);
    this.ready(actor);
    return this.dataSource!.transaction(async (m) => {
      const r = m.getRepository(Groupht),
        items = m.getRepository(Grouphtitems),
        row = await r.findOne({ where: { id } });
      if (!row) throw new NotFoundException('WORKSHEET_GROUP_NOT_FOUND');
      if (await items.count({ where: { groupHtId: id } }))
        throw new ConflictException('WORKSHEET_GROUP_HAS_ITEMS');
      await r.remove(row);
      await this.log(m, actor!, 'worksheet-group.deleted', row, ['id']);
      return true;
    });
  }
  getGroupList() {
    return this.repository
      .createQueryBuilder('groupht')
      .leftJoinAndSelect('groupht.grouphtitems', 'grouphtitems')
      .where('groupht.annulled = false')
      .orderBy('groupht.description', 'ASC')
      .addOrderBy('grouphtitems.id', 'ASC')
      .getMany();
  }
  private fields(b: UpdateGroup_htDto) {
    if (!b || typeof b !== 'object' || Array.isArray(b)) return [];
    const a = ['description', 'details', 'annulled'];
    const keys = Object.keys(b);
    if (keys.some((k) => !a.includes(k)))
      throw new BadRequestException('WORKSHEET_GROUP_FIELD_UNKNOWN');
    return a.filter((k) => Object.prototype.hasOwnProperty.call(b, k));
  }
  private description(v: unknown) {
    if (typeof v !== 'string' || v.trim() === '')
      throw new BadRequestException('WORKSHEET_GROUP_DESCRIPTION_REQUIRED');
    if (v.trim().length > 50)
      throw new BadRequestException('WORKSHEET_GROUP_DESCRIPTION_TOO_LONG');
    return v.trim();
  }
  private details(v: unknown) {
    if (v === undefined || v === null) return '';
    if (typeof v !== 'string')
      throw new BadRequestException('WORKSHEET_GROUP_DETAILS_INVALID');
    if (v.trim().length > 200)
      throw new BadRequestException('WORKSHEET_GROUP_DETAILS_TOO_LONG');
    return v.trim();
  }
  private bool(v: unknown) {
    if (typeof v !== 'boolean')
      throw new BadRequestException('WORKSHEET_GROUP_ANNULLED_INVALID');
    return v;
  }
  private id(v: number) {
    if (!Number.isInteger(v) || v <= 0)
      throw new BadRequestException('WORKSHEET_GROUP_ID_INVALID');
  }
  private ready(a?: number) {
    if (a === undefined) throw new Error('WORKSHEET_GROUP_ACTOR_REQUIRED');
    if (!this.dataSource || !this.audit)
      throw new Error('WORKSHEET_GROUP_TRANSACTION_UNAVAILABLE');
  }
  private async unique(r: Repository<Groupht>, d: string, id?: number) {
    const q = r
      .createQueryBuilder('g')
      .where('LOWER(TRIM(g.description))=LOWER(:d)', { d });
    if (id !== undefined) q.andWhere('g.id<>:id', { id });
    if (await q.getOne())
      throw new ConflictException('WORKSHEET_GROUP_DESCRIPTION_ALREADY_EXISTS');
  }
  private async log(
    m: EntityManager,
    a: number,
    action: string,
    row: Groupht,
    fields: string[],
    previous?: Record<string, unknown>,
  ) {
    await this.audit!.write(m, {
      actorUserId: a,
      action,
      entityType: 'worksheet_group',
      entityId: row.id,
      summary: action.split('-').join(' '),
      metadata: {
        previous: previous ?? null,
        current: {
          description: row.description,
          details: row.details,
          annulled: row.annulled,
        },
        changedFields: fields,
      },
    });
  }
}
