import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Like, Repository } from 'typeorm';
import { CreateGroup_htDto } from './dto/create-group_ht.dto';
import { UpdateGroup_htDto } from './dto/update-group_ht.dto';
import { Groupht } from './group_ht.entity';

@Injectable()
export class GroupHtService {
  constructor(@InjectRepository(Groupht) private readonly repository: Repository<Groupht>) {}

  getGroupHtList() { return this.repository.find({ relations: { grouphtitems: true }, order: { description: 'ASC' } }); }
  getGroupHtListActive() { return this.repository.find({ where: { annulled: false }, relations: { grouphtitems: true }, order: { description: 'ASC' } }); }

  async countWithLike(description: string) {
    const value = this.text(description, 50, 'WORKSHEET_GROUP_DESCRIPTION_REQUIRED', 'WORKSHEET_GROUP_DESCRIPTION_TOO_LONG');
    return this.repository.count({ where: { description: Like(`%${value}%`) } });
  }

  async getGroupHt(id: number) {
    this.id(id);
    const row = await this.repository.findOne({ where: { id }, relations: { grouphtitems: true } });
    if (!row) throw new NotFoundException('WORKSHEET_GROUP_NOT_FOUND');
    return row;
  }

  async createGroupHt(body: CreateGroup_htDto) {
    const payload = this.createPayload(body);
    await this.unique(payload.description);
    return this.save(this.repository.create(payload));
  }

  async updateGroupHt(id: number, body: UpdateGroup_htDto) {
    this.id(id);
    const row = await this.repository.findOne({ where: { id } });
    if (!row) throw new NotFoundException('WORKSHEET_GROUP_NOT_FOUND');
    const fields = this.updateFields(body);
    if (fields.length === 0) throw new BadRequestException('WORKSHEET_GROUP_UPDATE_REQUIRED');
    if (fields.includes('description')) {
      const description = this.text(body.description, 50, 'WORKSHEET_GROUP_DESCRIPTION_REQUIRED', 'WORKSHEET_GROUP_DESCRIPTION_TOO_LONG');
      await this.unique(description, id);
      row.description = description;
    }
    if (fields.includes('details')) row.details = this.optionalText(body.details, 200, 'WORKSHEET_GROUP_DETAILS_TOO_LONG');
    if (fields.includes('annulled')) {
      if (typeof body.annulled !== 'boolean') throw new BadRequestException('WORKSHEET_GROUP_ANNULLED_INVALID');
      row.annulled = body.annulled;
    }
    return this.save(row);
  }

  async deleteGroupHt(id: number) {
    const row = await this.getGroupHt(id);
    if (row.grouphtitems?.length) throw new ConflictException('WORKSHEET_GROUP_HAS_ITEMS');
    await this.repository.remove(row);
    return true;
  }

  getGroupList() {
    return this.repository.createQueryBuilder('groupht').leftJoinAndSelect('groupht.grouphtitems', 'grouphtitems').where('groupht.annulled = false').orderBy('groupht.description', 'ASC').addOrderBy('grouphtitems.id', 'ASC').getMany();
  }

  private createPayload(body: CreateGroup_htDto): Partial<Groupht> {
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw new BadRequestException('WORKSHEET_GROUP_BODY_REQUIRED');
    this.unknown(Object.keys(body), ['description', 'details', 'annulled']);
    if (body.annulled !== undefined && typeof body.annulled !== 'boolean') throw new BadRequestException('WORKSHEET_GROUP_ANNULLED_INVALID');
    return { description: this.text(body.description, 50, 'WORKSHEET_GROUP_DESCRIPTION_REQUIRED', 'WORKSHEET_GROUP_DESCRIPTION_TOO_LONG'), details: this.optionalText(body.details, 200, 'WORKSHEET_GROUP_DETAILS_TOO_LONG'), annulled: false };
  }

  private updateFields(body: UpdateGroup_htDto): string[] {
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw new BadRequestException('WORKSHEET_GROUP_BODY_REQUIRED');
    const fields = Object.keys(body);
    this.unknown(fields, ['description', 'details', 'annulled']);
    return fields;
  }

  private unknown(fields: string[], allowed: string[]) { if (fields.some((field) => !allowed.includes(field))) throw new BadRequestException('WORKSHEET_GROUP_FIELD_UNKNOWN'); }
  private id(value: number) { if (!Number.isInteger(value) || value <= 0) throw new BadRequestException('WORKSHEET_GROUP_ID_INVALID'); }
  private text(value: unknown, maximum: number, required: string, tooLong: string) { if (typeof value !== 'string' || value.trim() === '') throw new BadRequestException(required); const result = value.trim(); if (result.length > maximum) throw new BadRequestException(tooLong); return result; }
  private optionalText(value: unknown, maximum: number, tooLong: string) { if (value === undefined || value === null) return ''; if (typeof value !== 'string') throw new BadRequestException(tooLong); const result = value.trim(); if (result.length > maximum) throw new BadRequestException(tooLong); return result; }
  private async unique(description: string, excludedId?: number) { const query = this.repository.createQueryBuilder('group').where('LOWER(TRIM(group.description)) = LOWER(:description)', { description }); if (excludedId !== undefined) query.andWhere('group.id <> :excludedId', { excludedId }); if (await query.getOne()) throw new ConflictException('WORKSHEET_GROUP_DESCRIPTION_ALREADY_EXISTS'); }
  private async save(row: Groupht) { try { return await this.repository.save(row); } catch (error) { const driverError = error && typeof error === 'object' && 'driverError' in error ? error.driverError as { code?: string } : undefined; if (driverError?.code === 'ER_DUP_ENTRY') throw new ConflictException('WORKSHEET_GROUP_DESCRIPTION_ALREADY_EXISTS'); throw error; } }
}
