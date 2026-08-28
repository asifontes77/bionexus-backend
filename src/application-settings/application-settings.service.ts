import { BadRequestException, Injectable, NotFoundException, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { SecurityAuditService } from '../audit/security-audit.service';
import { Laboratory } from '../laboratory/laboratory.entity';
import { UpdateApplicationSettingsDto } from './dto/update-application-settings.dto';

const FIELDS = ['voucher_format','receipt_format','head_html','body_html','page_html','maximum_rows_report','workshee_format','printer_type','printer_interface'] as const;
type ApplicationSettings = Pick<Laboratory, typeof FIELDS[number]> & { id: number };

@Injectable()
export class ApplicationSettingsService {
  constructor(@InjectRepository(Laboratory) private readonly repository: Repository<Laboratory>, @Optional() private readonly dataSource?: DataSource, @Optional() private readonly audit?: SecurityAuditService) {}

  async get(id: number): Promise<ApplicationSettings> {
    this.validateId(id);
    const row = await this.repository.findOne({ where: { id } });
    if (!row) throw new NotFoundException('APPLICATION_SETTINGS_NOT_FOUND');
    return this.project(row);
  }

  async update(id: number, body: UpdateApplicationSettingsDto, actorUserId?: number): Promise<ApplicationSettings> {
    this.validateId(id);
    this.validate(body);
    if (actorUserId === undefined) throw new Error('APPLICATION_SETTINGS_ACTOR_REQUIRED');
    if (!this.dataSource || !this.audit) throw new Error('APPLICATION_SETTINGS_TRANSACTION_UNAVAILABLE');
    return this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(Laboratory);
      const row = await repository.findOne({ where: { id } });
      if (!row) throw new NotFoundException('APPLICATION_SETTINGS_NOT_FOUND');
      const changedFields = Object.keys(body);
      const saved = await repository.save(Object.assign(row, body));
      await this.writeAudit(manager, actorUserId, saved.id, changedFields);
      return this.project(saved);
    });
  }

  private validateId(id: number): void { if (!Number.isInteger(id) || id <= 0) throw new BadRequestException('APPLICATION_SETTINGS_ID_INVALID'); }
  private validate(body: UpdateApplicationSettingsDto): void {
    if (!body || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).length === 0) throw new BadRequestException('APPLICATION_SETTINGS_UPDATE_REQUIRED');
    const fields = Object.keys(body);
    if (fields.some((field) => !FIELDS.includes(field as typeof FIELDS[number]))) throw new BadRequestException('APPLICATION_SETTINGS_FIELD_UNKNOWN');
    for (const field of fields.filter((value) => value !== 'maximum_rows_report')) if (typeof body[field as keyof UpdateApplicationSettingsDto] !== 'string') throw new BadRequestException('APPLICATION_SETTINGS_TEXT_INVALID');
    if (body.maximum_rows_report !== undefined && (!Number.isInteger(body.maximum_rows_report) || body.maximum_rows_report < 1 || body.maximum_rows_report > 500)) throw new BadRequestException('APPLICATION_SETTINGS_ROWS_INVALID');
    for (const field of ['printer_type','printer_interface'] as const) if (body[field] !== undefined && body[field].length > 100) throw new BadRequestException('APPLICATION_SETTINGS_TEXT_INVALID');
  }
  private project(row: Laboratory): ApplicationSettings { return { id: row.id, voucher_format: row.voucher_format, receipt_format: row.receipt_format, head_html: row.head_html, body_html: row.body_html, page_html: row.page_html, maximum_rows_report: row.maximum_rows_report, workshee_format: row.workshee_format, printer_type: row.printer_type, printer_interface: row.printer_interface }; }
  private async writeAudit(manager: EntityManager, actorUserId: number, entityId: number, changedFields: string[]): Promise<void> { await this.audit!.write(manager, { actorUserId, action: 'application-settings.updated', entityType: 'laboratory', entityId, summary: 'Configuracion de la aplicacion actualizada', metadata: { changedFields } }); }
}