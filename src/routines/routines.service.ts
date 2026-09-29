import { BadRequestException, ConflictException, Injectable, NotFoundException, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, In, Like, QueryFailedError, Repository } from 'typeorm';
import { SecurityAuditService } from '../audit/security-audit.service';
import { Examlists } from '../exam_lists/examlists.entity';
import { ChangeRoutineStatusDto } from './dto/change-routine-status.dto';
import { CreateRoutinesDto } from './dto/create-routines.dto';
import { UpdateRoutinesDto } from './dto/update-routines.dto';
import { ExamRoutineItem } from './exam-routine-item.entity';
import { Routines } from './routines.entity';

type LegacyRoutineExam = { examId: number; description?: string; active?: boolean };
type NormalizedRoutineExam = { examId: number; active: boolean; activePresent: boolean };

@Injectable()
export class RoutinesService {
  constructor(
    @InjectRepository(Routines) private readonly routinesRepository: Repository<Routines>,
    @InjectRepository(ExamRoutineItem) private readonly itemsRepository: Repository<ExamRoutineItem>,
    private readonly dataSource: DataSource,
    @Optional() private readonly audit?: SecurityAuditService,
  ) {}

  async getRoutines(id: number) {
    this.validateId(id);
    const routine = await this.routinesRepository.findOne({ where: { id }, relations: { items: { examCatalog: true } }, order: { items: { position: 'ASC' } } });
    if (!routine) throw new NotFoundException('ROUTINE_NOT_FOUND');
    return this.projectLegacy(routine);
  }

  async getRoutinesList() {
    const routines = await this.routinesRepository.find({ relations: { items: { examCatalog: true } }, order: { id: 'ASC', items: { position: 'ASC' } } });
    return routines.map((routine) => this.projectLegacy(routine));
  }

  async createRoutines(dto: CreateRoutinesDto) {
    const exams = this.parseRegisteredExams(dto?.registered_exams, true);
    const description = this.validateText(dto?.description, 50, 'ROUTINE_DESCRIPTION_REQUIRED');
    const details = this.validateText(dto?.details, 200, 'ROUTINE_DETAILS_REQUIRED', true);
    await this.ensureDescriptionAvailable(this.routinesRepository, description);
    try {
      return await this.dataSource.transaction(async (manager) => {
        await this.validateCatalogs(manager, exams);
        const repository = manager.getRepository(Routines);
        const routine = await repository.save(repository.create({ description, details, registered_exams: this.legacyJson(exams) as unknown as string }));
        await this.replaceItems(manager, routine.id, exams);
        return this.getProjected(manager, routine.id);
      });
    } catch (error) {
      if (this.isDescriptionDuplicate(error)) throw new ConflictException('ROUTINE_DESCRIPTION_ALREADY_EXISTS');
      throw error;
    }
  }
  async updateRoutines(id: number, dto: UpdateRoutinesDto) {
    this.validateId(id);
    if (!dto || typeof dto !== 'object' || Array.isArray(dto) || Object.keys(dto).length === 0) throw new BadRequestException('ROUTINE_UPDATE_REQUIRED');
    try {
      return await this.dataSource.transaction(async (manager) => {
        const repository = manager.getRepository(Routines);
        const routine = await repository.findOne({ where: { id } });
        if (!routine) throw new NotFoundException('ROUTINE_NOT_FOUND');
        if (Object.prototype.hasOwnProperty.call(dto, 'description')) {
          const description = this.validateText(dto.description, 50, 'ROUTINE_DESCRIPTION_REQUIRED');
          await this.ensureDescriptionAvailable(repository, description, id);
          routine.description = description;
        }
        if (Object.prototype.hasOwnProperty.call(dto, 'details')) routine.details = this.validateText(dto.details, 200, 'ROUTINE_DETAILS_REQUIRED', true);
        if (Object.prototype.hasOwnProperty.call(dto, 'registered_exams')) {
          const exams = this.parseRegisteredExams(dto.registered_exams, true);
          await this.validateCatalogs(manager, exams);
          routine.registered_exams = this.legacyJson(exams) as unknown as string;
          await repository.save(routine);
          await this.replaceItems(manager, id, exams);
        } else {
          await repository.save(routine);
        }
        return this.getProjected(manager, id);
      });
    } catch (error) {
      if (this.isDescriptionDuplicate(error)) throw new ConflictException('ROUTINE_DESCRIPTION_ALREADY_EXISTS');
      throw error;
    }
  }
  async changeStatus(id: number, dto: ChangeRoutineStatusDto, actorUserId: number | null) {
    this.validateId(id);
    if (!dto || typeof dto !== 'object' || typeof dto.isActive !== 'boolean') throw new BadRequestException('ROUTINE_STATUS_INVALID');
    if (!Number.isInteger(actorUserId) || Number(actorUserId) <= 0) throw new BadRequestException('ROUTINE_STATUS_ACTOR_REQUIRED');
    if (!this.audit) throw new Error('ROUTINE_STATUS_AUDIT_UNAVAILABLE');
    return this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(Routines);
      const routine = await repository.createQueryBuilder('routine').setLock('pessimistic_write').where('routine.id = :id', { id }).getOne();
      if (!routine) throw new NotFoundException('ROUTINE_NOT_FOUND');
      if (routine.isActive === dto.isActive) return this.getProjected(manager, id);
      routine.isActive = dto.isActive;
      await repository.save(routine);
      await this.audit.write(manager, {
        actorUserId: Number(actorUserId),
        action: dto.isActive ? 'routine.activated' : 'routine.deactivated',
        entityType: 'exam_routine',
        entityId: id,
        summary: dto.isActive ? 'Rutina de examenes activada' : 'Rutina de examenes inactivada',
        metadata: { description: routine.description, isActive: dto.isActive },
      });
      return this.getProjected(manager, id);
    });
  }
  async deleteRoutines(id: number, actorUserId: number | null) {
    this.validateId(id);
    if (!Number.isInteger(actorUserId) || Number(actorUserId) <= 0) throw new BadRequestException('ROUTINE_DELETE_ACTOR_REQUIRED');
    if (!this.audit) throw new Error('ROUTINE_DELETE_AUDIT_UNAVAILABLE');
    return this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(Routines);
      const routine = await repository.findOne({ where: { id }, relations: { items: true } });
      if (!routine) throw new NotFoundException('ROUTINE_NOT_FOUND');
      const itemCount = Array.isArray(routine.items)
        ? routine.items.length
        : await manager.getRepository(ExamRoutineItem).count({ where: { routine_id: id } });
      await manager.getRepository(ExamRoutineItem).delete({ routine_id: id });
      await repository.remove(routine);
      await this.audit.write(manager, {
        actorUserId: Number(actorUserId),
        action: 'routine.deleted',
        entityType: 'exam_routine',
        entityId: id,
        summary: 'Rutina de examenes eliminada',
        metadata: { description: routine.description, details: routine.details, itemCount },
      });
      return { deleted: true, id, itemCount };
    });
  }

  countWithLike(description: string) {
    return this.routinesRepository.count({ where: { description: Like(`%${String(description ?? '').trim()}%`) } });
  }

  private async getProjected(manager: EntityManager, id: number) {
    const routine = await manager.getRepository(Routines).findOne({ where: { id }, relations: { items: { examCatalog: true } }, order: { items: { position: 'ASC' } } });
    if (!routine) throw new NotFoundException('ROUTINE_NOT_FOUND');
    return this.projectLegacy(routine);
  }

  private projectLegacy(routine: Routines): Routines {
    if (!Array.isArray(routine.items)) return routine;
    const projected: LegacyRoutineExam[] = routine.items.map((item) => {
      const value: LegacyRoutineExam = { examId: item.exam_catalog_id, description: item.examCatalog?.description };
      if (item.legacy_active_present) value.active = Boolean(item.is_active);
      return value;
    });
    routine.registered_exams = projected as unknown as string;
    return routine;
  }

  private parseRegisteredExams(value: unknown, required: boolean): NormalizedRoutineExam[] {
    let parsed = value;
    if (typeof value === 'string') {
      try { parsed = JSON.parse(value); } catch { throw new BadRequestException('ROUTINE_EXAMS_JSON_INVALID'); }
    }
    if (!Array.isArray(parsed)) {
      if (!required && parsed === undefined) return [];
      throw new BadRequestException('ROUTINE_EXAMS_ARRAY_REQUIRED');
    }
    if (parsed.length === 0 || parsed.length > 1000) throw new BadRequestException('ROUTINE_EXAMS_COUNT_INVALID');
    const seen = new Set<number>();
    return parsed.map((raw) => {
      if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new BadRequestException('ROUTINE_EXAM_ITEM_INVALID');
      const item = raw as Record<string, unknown>;
      const examId = Number(item.examId);
      if (!Number.isInteger(examId) || examId <= 0) throw new BadRequestException('ROUTINE_EXAM_ID_INVALID');
      if (seen.has(examId)) throw new BadRequestException('ROUTINE_EXAM_DUPLICATED');
      seen.add(examId);
      const activePresent = Object.prototype.hasOwnProperty.call(item, 'active');
      if (activePresent && typeof item.active !== 'boolean') throw new BadRequestException('ROUTINE_EXAM_ACTIVE_INVALID');
      return { examId, active: activePresent ? Boolean(item.active) : true, activePresent };
    });
  }

  private async validateCatalogs(manager: EntityManager, exams: NormalizedRoutineExam[]) {
    const ids = exams.map((item) => item.examId);
    const rows = await manager.getRepository(Examlists).find({ where: { id: In(ids) } });
    if (rows.length !== ids.length) throw new BadRequestException('ROUTINE_EXAMS_NOT_FOUND');
  }

  private async replaceItems(manager: EntityManager, routineId: number, exams: NormalizedRoutineExam[]) {
    const repository = manager.getRepository(ExamRoutineItem);
    await repository.delete({ routine_id: routineId });
    await repository.save(exams.map((item, index) => repository.create({ routine_id: routineId, exam_catalog_id: item.examId, position: index + 1, is_active: item.active, legacy_active_present: item.activePresent })));
  }

  private legacyJson(exams: NormalizedRoutineExam[]): LegacyRoutineExam[] {
    return exams.map((item) => item.activePresent ? { examId: item.examId, active: item.active } : { examId: item.examId });
  }

  private async ensureDescriptionAvailable(repository: Repository<Routines>, description: string, excludedId?: number) {
    const query = repository.createQueryBuilder('routine')
      .where('UPPER(TRIM(routine.description)) = UPPER(TRIM(:description))', { description });
    if (excludedId) query.andWhere('routine.id != :excludedId', { excludedId });
    if (await query.getCount()) throw new ConflictException('ROUTINE_DESCRIPTION_ALREADY_EXISTS');
  }
  private isDescriptionDuplicate(error: unknown) {
    const driverError = error instanceof QueryFailedError
      ? (error as QueryFailedError & { driverError?: { code?: string; errno?: number; message?: string } }).driverError
      : undefined;
    return driverError?.code === 'ER_DUP_ENTRY'
      && (driverError?.errno === 1062 || String(driverError?.message ?? '').includes('UX_exam_routines_description'));
  }
  private validateId(id: number) {
    if (!Number.isInteger(id) || id <= 0) throw new BadRequestException('ROUTINE_ID_INVALID');
  }

  private validateText(value: unknown, max: number, error: string, allowEmpty = false) {
    if (typeof value !== 'string') throw new BadRequestException(error);
    const text = value.trim();
    if (!allowEmpty && text === '') throw new BadRequestException(error);
    if (text.length > max) throw new BadRequestException('ROUTINE_TEXT_TOO_LONG');
    return text;
  }
}
