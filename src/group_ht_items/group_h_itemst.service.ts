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
import { Examlists } from '../exam_lists/examlists.entity';
import { Groupht } from '../group_ht/group_ht.entity';
import { CreateGroup_ht_itemsDto } from './dto/create-group_ht_items.dto';
import { UpdateGroup_ht_itemsDto } from './dto/update-group_ht_items.dto';
import { Grouphtitems } from './group_ht_items.entity';
@Injectable()
export class GroupHtItemsService {
  constructor(
    @InjectRepository(Grouphtitems)
    private readonly repository: Repository<Grouphtitems>,
    @InjectRepository(Groupht) private readonly groups: Repository<Groupht>,
    @InjectRepository(Examlists) private readonly exams: Repository<Examlists>,
    @Optional() private readonly dataSource?: DataSource,
    @Optional() private readonly audit?: SecurityAuditService,
  ) {}
  async getGroupItemsHt(id: number) {
    this.id(id);
    const row = await this.repository.findOne({ where: { id } });
    if (!row) throw new NotFoundException('WORKSHEET_GROUP_ITEM_NOT_FOUND');
    return row;
  }
  async createGroupItemsHt(body: CreateGroup_ht_itemsDto, actor?: number) {
    this.ready(actor);
    const groupHtId = this.groupId(body),
      examId = this.pos(body?.examId, 'WORKSHEET_GROUP_ITEM_EXAM_INVALID'),
      description = this.text(body?.description);
    return this.dataSource!.transaction(async (m) => {
      await this.refs(m, groupHtId, examId);
      const r = m.getRepository(Grouphtitems);
      await this.unique(r, groupHtId, examId);
      const row = await r.save(r.create({ groupHtId, examId, description }));
      await this.log(m, actor!, 'worksheet-group-item.created', row, [
        'groupHtId',
        'examId',
        'description',
      ]);
      return row;
    });
  }
  async updateGroupItemsHt(
    id: number,
    body: UpdateGroup_ht_itemsDto,
    actor?: number,
  ) {
    this.id(id);
    this.ready(actor);
    const fields = this.fields(body);
    if (!fields.length)
      throw new BadRequestException('WORKSHEET_GROUP_ITEM_UPDATE_REQUIRED');
    return this.dataSource!.transaction(async (m) => {
      const r = m.getRepository(Grouphtitems),
        row = await r.findOne({ where: { id } });
      if (!row) throw new NotFoundException('WORKSHEET_GROUP_ITEM_NOT_FOUND');
      const previous = {
        groupHtId: row.groupHtId,
        examId: row.examId,
        description: row.description,
      };
      const groupHtId = this.hasGroup(body)
          ? this.groupId(body)
          : row.groupHtId,
        examId = Object.prototype.hasOwnProperty.call(body, 'examId')
          ? this.pos(body.examId, 'WORKSHEET_GROUP_ITEM_EXAM_INVALID')
          : row.examId;
      await this.refs(m, groupHtId, examId);
      if (groupHtId !== row.groupHtId || examId !== row.examId)
        await this.unique(r, groupHtId, examId, id);
      row.groupHtId = groupHtId;
      row.examId = examId;
      if (Object.prototype.hasOwnProperty.call(body, 'description'))
        row.description = this.text(body.description);
      const saved = await r.save(row);
      await this.log(
        m,
        actor!,
        'worksheet-group-item.updated',
        saved,
        fields,
        previous,
      );
      return saved;
    });
  }
  async deleteGroupItems(id: number, actor?: number) {
    this.id(id);
    this.ready(actor);
    return this.dataSource!.transaction(async (m) => {
      const r = m.getRepository(Grouphtitems),
        row = await r.findOne({ where: { id } });
      if (!row) throw new NotFoundException('WORKSHEET_GROUP_ITEM_NOT_FOUND');
      await r.remove(row);
      await this.log(m, actor!, 'worksheet-group-item.deleted', row, ['id']);
      return true;
    });
  }
  private fields(b: UpdateGroup_ht_itemsDto) {
    if (!b || typeof b !== 'object' || Array.isArray(b)) return [];
    const a = ['groupHtId', 'gruopHtId', 'examId', 'description'],
      keys = Object.keys(b);
    if (keys.some((k) => !a.includes(k)))
      throw new BadRequestException('WORKSHEET_GROUP_ITEM_FIELD_UNKNOWN');
    return a.filter((k) => Object.prototype.hasOwnProperty.call(b, k));
  }
  private hasGroup(b: UpdateGroup_ht_itemsDto) {
    return (
      Object.prototype.hasOwnProperty.call(b, 'groupHtId') ||
      Object.prototype.hasOwnProperty.call(b, 'gruopHtId')
    );
  }
  private groupId(b: CreateGroup_ht_itemsDto | UpdateGroup_ht_itemsDto) {
    const n = b.groupHtId,
      l = b.gruopHtId;
    if (n !== undefined && l !== undefined && Number(n) !== Number(l))
      throw new BadRequestException(
        'WORKSHEET_GROUP_ITEM_GROUP_ALIAS_CONFLICT',
      );
    return this.pos(n ?? l, 'WORKSHEET_GROUP_ITEM_GROUP_INVALID');
  }
  private pos(v: unknown, e: string) {
    const n = Number(v);
    if (!Number.isInteger(n) || n <= 0) throw new BadRequestException(e);
    return n;
  }
  private text(v: unknown) {
    if (typeof v !== 'string' || v.trim() === '')
      throw new BadRequestException(
        'WORKSHEET_GROUP_ITEM_DESCRIPTION_REQUIRED',
      );
    if (v.trim().length > 60)
      throw new BadRequestException(
        'WORKSHEET_GROUP_ITEM_DESCRIPTION_TOO_LONG',
      );
    return v.trim();
  }
  private id(v: number) {
    if (!Number.isInteger(v) || v <= 0)
      throw new BadRequestException('WORKSHEET_GROUP_ITEM_ID_INVALID');
  }
  private ready(a?: number) {
    if (a === undefined) throw new Error('WORKSHEET_GROUP_ITEM_ACTOR_REQUIRED');
    if (!this.dataSource || !this.audit)
      throw new Error('WORKSHEET_GROUP_ITEM_TRANSACTION_UNAVAILABLE');
  }
  private async refs(m: EntityManager, g: number, e: number) {
    if (!(await m.getRepository(Groupht).findOne({ where: { id: g } })))
      throw new NotFoundException('WORKSHEET_GROUP_NOT_FOUND');
    if (!(await m.getRepository(Examlists).findOne({ where: { id: e } })))
      throw new NotFoundException('WORKSHEET_GROUP_ITEM_EXAM_NOT_FOUND');
  }
  private async unique(
    r: Repository<Grouphtitems>,
    g: number,
    e: number,
    id?: number,
  ) {
    const q = r
      .createQueryBuilder('i')
      .where('i.groupHtId=:g AND i.examId=:e', { g, e });
    if (id !== undefined) q.andWhere('i.id<>:id', { id });
    if (await q.getOne())
      throw new ConflictException('WORKSHEET_GROUP_ITEM_ALREADY_EXISTS');
  }
  private async log(
    m: EntityManager,
    a: number,
    action: string,
    row: Grouphtitems,
    fields: string[],
    previous?: Record<string, unknown>,
  ) {
    await this.audit!.write(m, {
      actorUserId: a,
      action,
      entityType: 'worksheet_group_item',
      entityId: row.id,
      summary: action.split('-').join(' '),
      metadata: {
        previous: previous ?? null,
        current: {
          groupHtId: row.groupHtId,
          examId: row.examId,
          description: row.description,
        },
        changedFields: fields,
      },
    });
  }
}
