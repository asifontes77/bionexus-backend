import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Not, Repository } from 'typeorm';
import { SecurityAuditService } from '../audit/security-audit.service';
import { Examlists } from '../exam_lists/examlists.entity';
import { special_test_items } from '../special_test_items/special_test_items.entity';
import { CreateSpecialTestLabDto } from './dto/create-special_test_lab.dto';
import { UpdateSpecialTestLabDto } from './dto/update-special_test_lab.dto';
import { special_test_lab } from './special_test_lab.entity';

@Injectable()
export class SpecialTestLabService {
  constructor(@InjectRepository(special_test_lab) private readonly repository: Repository<special_test_lab>, private readonly dataSource: DataSource, private readonly audit: SecurityAuditService) {}

  getSpecialTestLabList() { return this.repository.find({ relations: { specialTestItems: true }, order: { description: 'ASC' } }); }

  async getSpecialTestLab(id: number) {
    this.assertId(id);
    const record = await this.repository.findOne({ where: { id }, relations: { specialTestItems: true } });
    if (!record) throw new NotFoundException('SPECIAL_TEST_NOT_FOUND');
    return record;
  }

  async createSpecialTestLab(input: CreateSpecialTestLabDto, actorUserId?: number) {
    const values = this.normalizeCreate(input);
    return this.write(actorUserId, async (manager) => {
      const repository = manager.getRepository(special_test_lab);
      await this.assertUnique(repository, values.description);
      const { examIds, ...labValues } = values;
      const saved = await repository.save(repository.create({ ...labValues, annulled: false }));
      const examRepository = manager.getRepository(Examlists);
      const itemRepository = manager.getRepository(special_test_items);
      for (const examId of examIds) {
        const exam = await examRepository.findOne({ where: { id: examId, annulled: false } });
        if (!exam) throw new BadRequestException('SPECIAL_TEST_EXAM_NOT_FOUND');
        await itemRepository.save(itemRepository.create({ specialTestLabId: saved.id, exam_list_Id: exam.id, description: exam.description }));
      }
      await this.writeAudit(manager, actorUserId!, 'special-tests.created', saved.id, { changedFields: Object.keys(labValues), examCount: examIds.length });
      return saved;
    });
  }

  async updateSpecialTestLab(id: number, input: UpdateSpecialTestLabDto, actorUserId?: number) {
    this.assertId(id);
    const changes = this.normalizeUpdate(input);
    return this.write(actorUserId, async (manager) => {
      const repository = manager.getRepository(special_test_lab);
      const record = await repository.findOne({ where: { id } });
      if (!record) throw new NotFoundException('SPECIAL_TEST_NOT_FOUND');
      if (changes.description !== undefined) await this.assertUnique(repository, changes.description, id);
      const previousAnnulled = Boolean(record.annulled);
      Object.assign(record, changes);
      const saved = await repository.save(record);
      {
        const action = changes.annulled === undefined || changes.annulled === previousAnnulled ? 'special-tests.updated' : changes.annulled ? 'special-tests.deactivated' : 'special-tests.activated';
        await this.writeAudit(manager, actorUserId!, action, saved.id, { changedFields: Object.keys(changes), previousAnnulled });
      }
      return saved;
    });
  }

  private normalizeCreate(input: CreateSpecialTestLabDto) {
    this.assertObject(input);
    this.assertKnown(input, ['description', 'details', 'address', 'phone_1', 'phone_2', 'email', 'examIds']);
    const examIds = this.examIds(input.examIds);
    return {
      description: this.text(input.description, 60, 'DESCRIPTION', true),
      details: this.text(input.details ?? '', 200, 'DETAILS', false),
      address: this.text(input.address, 255, 'ADDRESS', false),
      phone_1: this.phone(input.phone_1, 'PHONE_1'),
      phone_2: this.phone(input.phone_2, 'PHONE_2'),
      email: this.email(input.email),
      examIds,
    };
  }

  private normalizeUpdate(input: UpdateSpecialTestLabDto): Partial<special_test_lab> {
    this.assertObject(input); this.assertKnown(input, ['description', 'details', 'address', 'phone_1', 'phone_2', 'email', 'annulled']);
    const out: Partial<special_test_lab> = {};
    const has = (field: string) => Object.prototype.hasOwnProperty.call(input, field) && (input as Record<string, unknown>)[field] !== undefined;
    if (has('description')) out.description = this.text(input.description, 60, 'DESCRIPTION', true);
    if (has('details')) out.details = this.text(input.details, 200, 'DETAILS', false);
    if (has('address')) out.address = this.text(input.address, 255, 'ADDRESS', false);
    if (has('phone_1')) out.phone_1 = this.phone(input.phone_1, 'PHONE_1');
    if (has('phone_2')) out.phone_2 = this.phone(input.phone_2, 'PHONE_2');
    if (has('email')) out.email = this.email(input.email);
    if (has('annulled')) { if (typeof input.annulled !== 'boolean') throw new BadRequestException('SPECIAL_TEST_ANNULLED_INVALID'); out.annulled = input.annulled; }
    if (!Object.keys(out).length) throw new BadRequestException('SPECIAL_TEST_UPDATE_REQUIRED');
    return out;
  }

  private examIds(value: unknown): number[] {
    if (!Array.isArray(value) || value.length === 0) throw new BadRequestException('SPECIAL_TEST_EXAMS_REQUIRED');
    const ids = value.map((item) => Number(item));
    if (ids.some((item) => !Number.isInteger(item) || item <= 0)) throw new BadRequestException('SPECIAL_TEST_EXAM_ID_INVALID');
    if (new Set(ids).size !== ids.length) throw new BadRequestException('SPECIAL_TEST_EXAM_DUPLICATED');
    return ids;
  }
  private assertObject(value: unknown) { if (!value || typeof value !== 'object' || Array.isArray(value)) throw new BadRequestException('SPECIAL_TEST_PAYLOAD_REQUIRED'); }
  private assertKnown(value: object, allowed: string[]) { if (Object.keys(value).some((key) => !allowed.includes(key))) throw new BadRequestException('SPECIAL_TEST_FIELD_UNKNOWN'); }
  private text(value: unknown, max: number, field: string, required: boolean) { if (typeof value !== 'string' || (required && !value.trim())) throw new BadRequestException(`SPECIAL_TEST_${field}_REQUIRED`); const result = value.trim(); if (result.length > max) throw new BadRequestException(`SPECIAL_TEST_${field}_TOO_LONG`); return result; }
  private phone(value: unknown, field: string) { const result = this.text(value, 30, field, false); if (result && !/^[+0-9() .-]+$/.test(result)) throw new BadRequestException(`SPECIAL_TEST_${field}_INVALID`); return result; }
  private email(value: unknown) { const result = this.text(value, 100, 'EMAIL', false).toLowerCase(); if (result && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(result)) throw new BadRequestException('SPECIAL_TEST_EMAIL_INVALID'); return result; }
  private assertId(id: number) { if (!Number.isInteger(id) || id <= 0) throw new BadRequestException('SPECIAL_TEST_ID_INVALID'); }
  private async assertUnique(repository: Repository<special_test_lab>, description: string, id?: number) { const existing = await repository.findOne({ where: { description, ...(id ? { id: Not(id) } : {}) } }); if (existing) throw new ConflictException('SPECIAL_TEST_DESCRIPTION_ALREADY_EXISTS'); }
  private write<T>(actorUserId: number | undefined, action: (manager: EntityManager) => Promise<T>) { if (!Number.isInteger(actorUserId) || Number(actorUserId) <= 0) throw new BadRequestException('SPECIAL_TEST_ACTOR_REQUIRED'); return this.dataSource.transaction((manager) => action(manager)); }
  private writeAudit(manager: EntityManager, actorUserId: number, action: string, entityId: number, metadata: Record<string, unknown>) { return this.audit!.write(manager, { actorUserId, action, entityType: 'special_test_lab', entityId, summary: 'Prueba especial actualizada', metadata }); }
}
