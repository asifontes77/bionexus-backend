import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Examlists } from '../exam_lists/examlists.entity';
import { Groupht } from '../group_ht/group_ht.entity';
import { CreateGroup_ht_itemsDto } from './dto/create-group_ht_items.dto';
import { UpdateGroup_ht_itemsDto } from './dto/update-group_ht_items.dto';
import { Grouphtitems } from './group_ht_items.entity';

@Injectable()
export class GroupHtItemsService {
  constructor(
    @InjectRepository(Grouphtitems) private readonly repository: Repository<Grouphtitems>,
    @InjectRepository(Groupht) private readonly groupRepository: Repository<Groupht>,
    @InjectRepository(Examlists) private readonly examRepository: Repository<Examlists>,
  ) {}

  async getGroupItemsHt(id: number) { this.id(id, 'WORKSHEET_GROUP_ITEM_ID_INVALID'); const row = await this.repository.findOne({ where: { id } }); if (!row) throw new NotFoundException('WORKSHEET_GROUP_ITEM_NOT_FOUND'); return row; }

  async createGroupItemsHt(body: CreateGroup_ht_itemsDto) {
    const payload = this.createPayload(body);
    await this.references(payload.groupHtId, payload.examId);
    await this.unique(payload.groupHtId, payload.examId);
    return this.save(this.repository.create(payload));
  }

  async updateGroupItemsHt(id: number, body: UpdateGroup_ht_itemsDto) {
    this.id(id, 'WORKSHEET_GROUP_ITEM_ID_INVALID');
    const row = await this.repository.findOne({ where: { id } });
    if (!row) throw new NotFoundException('WORKSHEET_GROUP_ITEM_NOT_FOUND');
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw new BadRequestException('WORKSHEET_GROUP_ITEM_BODY_REQUIRED');
    const fields = Object.keys(body);
    if (fields.length === 0) throw new BadRequestException('WORKSHEET_GROUP_ITEM_UPDATE_REQUIRED');
    if (fields.some((field) => !['groupHtId', 'examId', 'description'].includes(field))) throw new BadRequestException('WORKSHEET_GROUP_ITEM_FIELD_UNKNOWN');
    const groupHtId = body.groupHtId === undefined ? row.groupHtId : this.positive(body.groupHtId, 'WORKSHEET_GROUP_ID_INVALID');
    const examId = body.examId === undefined ? row.examId : this.positive(body.examId, 'WORKSHEET_GROUP_ITEM_EXAM_ID_INVALID');
    await this.references(groupHtId, examId);
    await this.unique(groupHtId, examId, id);
    row.groupHtId = groupHtId;
    row.examId = examId;
    if (body.description !== undefined) row.description = this.text(body.description);
    return this.save(row);
  }

  async deleteGroupItems(id: number) { const row = await this.getGroupItemsHt(id); await this.repository.remove(row); return true; }

  private createPayload(body: CreateGroup_ht_itemsDto): Partial<Grouphtitems> {
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw new BadRequestException('WORKSHEET_GROUP_ITEM_BODY_REQUIRED');
    const fields = Object.keys(body);
    if (fields.some((field) => !['groupHtId', 'examId', 'description'].includes(field))) throw new BadRequestException('WORKSHEET_GROUP_ITEM_FIELD_UNKNOWN');
    return { groupHtId: this.positive(body.groupHtId, 'WORKSHEET_GROUP_ID_INVALID'), examId: this.positive(body.examId, 'WORKSHEET_GROUP_ITEM_EXAM_ID_INVALID'), description: this.text(body.description) };
  }

  private async references(groupHtId: number, examId: number) { const group = await this.groupRepository.findOne({ where: { id: groupHtId } }); if (!group) throw new NotFoundException('WORKSHEET_GROUP_NOT_FOUND'); if (group.annulled) throw new ConflictException('WORKSHEET_GROUP_INACTIVE'); if (!await this.examRepository.findOne({ where: { id: examId } })) throw new NotFoundException('WORKSHEET_GROUP_ITEM_EXAM_NOT_FOUND'); }
  private async unique(groupHtId: number, examId: number, excludedId?: number) { const query = this.repository.createQueryBuilder('item').where('item.groupHtId = :groupHtId', { groupHtId }).andWhere('item.examId = :examId', { examId }); if (excludedId !== undefined) query.andWhere('item.id <> :excludedId', { excludedId }); if (await query.getOne()) throw new ConflictException('WORKSHEET_GROUP_ITEM_ALREADY_EXISTS'); }
  private id(value: number, error: string) { if (!Number.isInteger(value) || value <= 0) throw new BadRequestException(error); }
  private positive(value: unknown, error: string) { const result = Number(value); this.id(result, error); return result; }
  private text(value: unknown) { if (typeof value !== 'string' || value.trim() === '') throw new BadRequestException('WORKSHEET_GROUP_ITEM_DESCRIPTION_REQUIRED'); const result = value.trim(); if (result.length > 60) throw new BadRequestException('WORKSHEET_GROUP_ITEM_DESCRIPTION_TOO_LONG'); return result; }
  private async save(row: Grouphtitems) { try { return await this.repository.save(row); } catch (error) { const driverError = error && typeof error === 'object' && 'driverError' in error ? error.driverError as { code?: string } : undefined; if (driverError?.code === 'ER_DUP_ENTRY') throw new ConflictException('WORKSHEET_GROUP_ITEM_ALREADY_EXISTS'); throw error; } }
}
