import {
  BadRequestException,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import * as nodemailer from 'nodemailer';
import { SecurityAuditService } from '../audit/security-audit.service';
import { UpdateLaboratoryDto } from './dto/update-laboratorio.dto';
import { CompleteLaboratoryEmailSettings, LaboratoryEmailSettingsDto } from './dto/test-laboratory-email.dto';
import { Laboratory } from './laboratory.entity';

type EmailSettings = Partial<LaboratoryEmailSettingsDto>;

type PublicLaboratory = Omit<Laboratory, 'license' | 'sendEmail'> & {
  sendEmail: EmailSettings | null;
};

@Injectable()
export class LaboratoryService {
  constructor(
    @InjectRepository(Laboratory)
    private readonly laboratoryRepository: Repository<Laboratory>,
    @Optional() private readonly dataSource?: DataSource,
    @Optional() private readonly securityAuditService?: SecurityAuditService,
  ) {}

  async getLaboratory(id: number): Promise<Laboratory> {
    this.validateId(id);

    const laboratoryFound = await this.laboratoryRepository.findOne({
      where: {
        id,
      },
    });

    if (!laboratoryFound) {
      throw new NotFoundException('LABORATORY_NOT_FOUND');
    }

    return laboratoryFound;
  }

  async getPublicLaboratory(id: number): Promise<PublicLaboratory> {
    return this.toPublicLaboratory(await this.getLaboratory(id));
  }

  async getPublicLaboratorySetting() {
    const laboratoryFound = await this.laboratoryRepository.find({
      take: 1,
    });

    return laboratoryFound.map((laboratory) =>
      this.toPublicLaboratory(laboratory),
    );
  }

  async testEmailConnection(
    id: number,
    incoming: LaboratoryEmailSettingsDto,
    actorUserId?: number,
  ): Promise<{ success: true; mode: 'gmail' | 'smtp' }> {
    this.validateId(id);
    const laboratory = await this.getLaboratory(id);
    const settings = this.resolveEmailSettings(laboratory, incoming);
    this.validateEmailSettings(settings, true);
    const mode = settings.isGmail ? 'gmail' : 'smtp';
    try {
      const transporter = nodemailer.createTransport(this.createTransportOptions(settings));
      await transporter.verify();
      await this.writeEmailConnectionAudit(actorUserId, id, mode, true);
      return { success: true, mode };
    } catch {
      await this.writeEmailConnectionAudit(actorUserId, id, mode, false);
      throw new BadRequestException('LABORATORY_EMAIL_CONNECTION_FAILED');
    }
  }
  async updateLaboratory(
    id: number,
    laboratory: UpdateLaboratoryDto,
    actorUserId?: number,
    action: 'laboratory.updated' | 'laboratory.logo.updated' = 'laboratory.updated',
  ): Promise<Laboratory> {
    this.validateId(id);
    this.validateUpdate(laboratory);
    if (actorUserId === undefined) {
      return this.updateWithRepository(this.laboratoryRepository, id, laboratory);
    }
    if (!this.dataSource) throw new Error('LABORATORY_TRANSACTION_UNAVAILABLE');
    return this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(Laboratory);
      const saved = await this.updateWithRepository(repository, id, laboratory);
      await this.writeAudit(manager, actorUserId, action, saved.id, Object.keys(laboratory));
      return saved;
    });
  }

  private async updateWithRepository(
    repository: Repository<Laboratory>,
    id: number,
    laboratory: UpdateLaboratoryDto,
  ): Promise<Laboratory> {
    const laboratoryFound = await repository.findOne({ where: { id } });
    if (!laboratoryFound) throw new NotFoundException('LABORATORY_NOT_FOUND');
    const changes = this.preserveEmailPassword(laboratoryFound, laboratory);
    return repository.save(Object.assign(laboratoryFound, changes));
  }

  private async writeAudit(
    manager: EntityManager,
    actorUserId: number,
    action: 'laboratory.updated' | 'laboratory.logo.updated',
    entityId: number,
    changedFields: string[],
  ): Promise<void> {
    if (!this.securityAuditService) throw new Error('SECURITY_AUDIT_SERVICE_UNAVAILABLE');
    await this.securityAuditService.write(manager, {
      actorUserId,
      action,
      entityType: 'laboratory',
      entityId,
      summary: action === 'laboratory.logo.updated'
        ? 'Logo del laboratorio actualizado'
        : 'Configuracion del laboratorio actualizada',
      metadata: {
        changedFields: changedFields.filter((field) => field !== 'license'),
      },
    });
  }

  private validateId(id: number): void {
    if (!Number.isInteger(id) || id <= 0) {
      throw new BadRequestException('LABORATORY_ID_INVALID');
    }
  }

  private validateUpdate(laboratory: UpdateLaboratoryDto): void {
    if (!laboratory || typeof laboratory !== 'object' || Array.isArray(laboratory)) {
      throw new BadRequestException('LABORATORY_UPDATE_REQUIRED');
    }
    if (Object.keys(laboratory).length === 0) {
      throw new BadRequestException('LABORATORY_UPDATE_REQUIRED');
    }
    const allowedFields = [
      'name', 'business_name', 'address', 'rif', 'phone_1', 'phone_2',
      'email', 'logo', 'print_invoice', 'print_sample_take', 'url',
      'invoice_number', 'creditnote_number', 'voucher_number', 'mask_phone',
      'voucher_format', 'rows_description_invoices', 'max_height_logo',
      'max_width_logo', 'settingQR', 'sendEmail', 'head_html', 'body_html',
      'page_html', 'maximum_rows_report', 'workshee_format', 'printer_type',
      'printer_interface', 'receipt_format', 'rows_description_receipt',
      'receipt_number', 'print_receipt',
    ];
    const fields = Object.keys(laboratory);
    if (fields.includes('license')) {
      throw new BadRequestException('LABORATORY_LICENSE_READ_ONLY');
    }
    if (fields.some((field) => !allowedFields.includes(field))) {
      throw new BadRequestException('LABORATORY_FIELD_UNKNOWN');
    }
    this.validateStringFields(laboratory);
    this.validateBooleanFields(laboratory);
    this.validateIntegerFields(laboratory);
    this.validateIdentityFields(laboratory);
    this.validateQrSettings(laboratory.settingQR);
    if (laboratory.sendEmail !== undefined) this.validateEmailSettings(laboratory.sendEmail, false);
  }

  private validateStringFields(body: UpdateLaboratoryDto): void {
    const maximums: Record<string, number> = {
      name: 50, business_name: 100, address: 200, rif: 20, phone_1: 20,
      phone_2: 20, email: 100, logo: 100, url: 100, mask_phone: 20,
      printer_type: 100, printer_interface: 100,
    };
    for (const [field, maximum] of Object.entries(maximums)) {
      if (!Object.prototype.hasOwnProperty.call(body, field)) continue;
      const value = body[field as keyof UpdateLaboratoryDto];
      if (typeof value !== 'string' || value.length > maximum) {
        throw new BadRequestException('LABORATORY_TEXT_INVALID');
      }
    }
  }

  private validateBooleanFields(body: UpdateLaboratoryDto): void {
    for (const field of ['print_invoice', 'print_sample_take', 'print_receipt']) {
      if (!Object.prototype.hasOwnProperty.call(body, field)) continue;
      if (typeof body[field as keyof UpdateLaboratoryDto] !== 'boolean') {
        throw new BadRequestException('LABORATORY_BOOLEAN_INVALID');
      }
    }
  }

  private validateIntegerFields(body: UpdateLaboratoryDto): void {
    const fields = [
      'invoice_number', 'creditnote_number', 'voucher_number',
      'rows_description_invoices', 'max_height_logo', 'max_width_logo',
      'maximum_rows_report', 'rows_description_receipt', 'receipt_number',
    ];
    for (const field of fields) {
      if (!Object.prototype.hasOwnProperty.call(body, field)) continue;
      const value = body[field as keyof UpdateLaboratoryDto];
      if (!Number.isInteger(value) || Number(value) < 0) {
        throw new BadRequestException('LABORATORY_INTEGER_INVALID');
      }
      if (
        (field === 'max_height_logo' || field === 'max_width_logo') &&
        (Number(value) < 20 || Number(value) > 200)
      ) {
        throw new BadRequestException('LABORATORY_LOGO_DIMENSION_INVALID');
      }
    }
  }

  private validateIdentityFields(body: UpdateLaboratoryDto): void {
    this.validatePattern(body, 'email', /^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'LABORATORY_EMAIL_INVALID');
    this.validatePattern(body, 'url', /^https?:\/\/[^\s]+$/i, 'LABORATORY_URL_INVALID', true);
    this.validatePattern(body, 'rif', /^[VEJGvejg]-?\d{7,9}-?\d$/, 'LABORATORY_RIF_INVALID');
    this.validatePattern(body, 'phone_1', /^[+\d][\d\s()-]{5,19}$/, 'LABORATORY_PHONE_INVALID');
    this.validatePattern(body, 'phone_2', /^[+\d][\d\s()-]{5,19}$/, 'LABORATORY_PHONE_INVALID', true);
    if (Object.prototype.hasOwnProperty.call(body, 'mask_phone')) {
      const mask = body.mask_phone;
      if (typeof mask !== 'string' || mask.trim() === '' || !mask.includes('#')) {
        throw new BadRequestException('LABORATORY_PHONE_MASK_INVALID');
      }
    }
  }

  private validatePattern(
    body: UpdateLaboratoryDto,
    field: keyof UpdateLaboratoryDto,
    pattern: RegExp,
    errorCode: string,
    allowEmpty = false,
  ): void {
    if (!Object.prototype.hasOwnProperty.call(body, field)) return;
    const value = body[field];
    if (typeof value !== 'string') return;
    const normalized = value.trim();
    if (allowEmpty && normalized === '') return;
    if (!pattern.test(normalized)) throw new BadRequestException(errorCode);
  }

  private validateQrSettings(value: unknown): void {
    if (value === undefined) return;
    if (value === null || typeof value !== 'object' || Array.isArray(value)) {
      throw new BadRequestException('LABORATORY_QR_INVALID');
    }
    const settings = value as Record<string, unknown>;
    const allowed = ['activeQR', 'fn', 'email', 'phone', 'bioanalista', 'codigo'];
    if (Object.keys(settings).some((field) => !allowed.includes(field))) {
      throw new BadRequestException('LABORATORY_QR_FIELD_UNKNOWN');
    }
    if ('activeQR' in settings && typeof settings.activeQR !== 'boolean') {
      throw new BadRequestException('LABORATORY_QR_ACTIVE_INVALID');
    }
    this.validateQrText(settings, 'fn', 100);
    this.validateQrText(settings, 'email', 100);
    this.validateQrText(settings, 'phone', 20);
    this.validateQrText(settings, 'bioanalista', 100);
    this.validateQrText(settings, 'codigo', 50);
    if (typeof settings.email === 'string' && settings.email.trim() !== '' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(settings.email.trim())) {
      throw new BadRequestException('LABORATORY_QR_EMAIL_INVALID');
    }
    if (typeof settings.phone === 'string' && settings.phone.trim() !== '' && !/^[+\d][\d\s()-]{5,19}$/.test(settings.phone.trim())) {
      throw new BadRequestException('LABORATORY_QR_PHONE_INVALID');
    }
  }

  private validateQrText(settings: Record<string, unknown>, field: string, maximum: number): void {
    if (!(field in settings)) return;
    const value = settings[field];
    if (typeof value !== 'string' || value.length > maximum) {
      throw new BadRequestException('LABORATORY_QR_TEXT_INVALID');
    }
  }

  private validateEmailSettings(value: unknown, requirePassword: boolean): asserts value is CompleteLaboratoryEmailSettings {
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new BadRequestException('LABORATORY_EMAIL_SETTINGS_INVALID');
    const settings = value as unknown as Record<string, unknown>;
    const allowed = ['isGmail', 'host', 'port', 'secure', 'user', 'pass', 'from'];
    if (Object.keys(settings).some((field) => !allowed.includes(field))) throw new BadRequestException('LABORATORY_EMAIL_FIELD_UNKNOWN');
    if (typeof settings.isGmail !== 'boolean') throw new BadRequestException('LABORATORY_EMAIL_MODE_INVALID');
    if (typeof settings.user !== 'string' || settings.user.trim() === '') throw new BadRequestException('LABORATORY_EMAIL_USER_REQUIRED');
    if (typeof settings.from !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(settings.from.trim())) throw new BadRequestException('LABORATORY_EMAIL_FROM_INVALID');
    if (settings.pass !== undefined && typeof settings.pass !== 'string') throw new BadRequestException('LABORATORY_EMAIL_PASSWORD_INVALID');
    if (requirePassword && String(settings.pass ?? '').trim() === '') throw new BadRequestException('LABORATORY_EMAIL_PASSWORD_REQUIRED');
    if (!settings.isGmail) {
      if (typeof settings.host !== 'string' || settings.host.trim() === '') throw new BadRequestException('LABORATORY_EMAIL_HOST_REQUIRED');
      if (!Number.isInteger(settings.port) || Number(settings.port) < 1 || Number(settings.port) > 65535) throw new BadRequestException('LABORATORY_EMAIL_PORT_INVALID');
      if (typeof settings.secure !== 'boolean') throw new BadRequestException('LABORATORY_EMAIL_SECURE_INVALID');
    }
  }
  private resolveEmailSettings(laboratory: Laboratory, incoming: LaboratoryEmailSettingsDto): CompleteLaboratoryEmailSettings {
    this.validateEmailSettings(incoming, false);
    const current = this.parseEmailSettings(laboratory.sendEmail);
    const pass = incoming.pass?.trim() ? incoming.pass : current.pass;
    return { ...incoming, isGmail: incoming.isGmail as boolean, user: incoming.user as string, from: incoming.from as string, pass };
  }
  private createTransportOptions(settings: CompleteLaboratoryEmailSettings): Record<string, unknown> {
    const auth = { user: settings.user.trim(), pass: settings.pass };
    return settings.isGmail
      ? { service: 'Gmail', auth }
      : { host: settings.host?.trim(), port: settings.port, secure: settings.secure, auth };
  }
  private async writeEmailConnectionAudit(actorUserId: number | undefined, entityId: number, mode: 'gmail' | 'smtp', success: boolean): Promise<void> {
    if (actorUserId === undefined) return;
    if (!this.dataSource) throw new Error('LABORATORY_TRANSACTION_UNAVAILABLE');
    await this.dataSource.transaction(async (manager) => {
      if (!this.securityAuditService) throw new Error('SECURITY_AUDIT_SERVICE_UNAVAILABLE');
      await this.securityAuditService.write(manager, {
        actorUserId,
        action: 'laboratory.email.connection-tested',
        entityType: 'laboratory',
        entityId,
        summary: success ? 'Conexion de correo verificada' : 'Conexion de correo rechazada',
        metadata: { mode, success },
      });
    });
  }
  private toPublicLaboratory(laboratory: Laboratory): PublicLaboratory {
    const serialized = JSON.parse(JSON.stringify(laboratory)) as Omit<
      Laboratory,
      'sendEmail'
    > & {
      sendEmail: EmailSettings | null;
    };

    const {
      license: omittedLicense,
      sendEmail,
      ...publicLaboratory
    } = serialized;

    void omittedLicense;

    return {
      ...publicLaboratory,
      sendEmail:
        sendEmail === null
          ? null
          : {
              ...sendEmail,
              pass: '',
            },
    };
  }

  private preserveEmailPassword(
    laboratory: Laboratory,
    changes: UpdateLaboratoryDto,
  ): UpdateLaboratoryDto {
    if (!changes.sendEmail) {
      return changes;
    }

    const currentEmail = this.parseEmailSettings(laboratory.sendEmail);

    const incomingEmail = this.parseEmailSettings(changes.sendEmail);

    if (incomingEmail.pass === undefined || incomingEmail.pass.trim() === '') {
      incomingEmail.pass = currentEmail.pass ?? '';
    }

    return {
      ...changes,
      sendEmail: incomingEmail,
    };
  }

  private parseEmailSettings(value: unknown): EmailSettings {
    if (value === null || value === undefined) {
      return {};
    }

    if (typeof value === 'string') {
      try {
        return JSON.parse(value) as EmailSettings;
      } catch {
        return {};
      }
    }

    if (typeof value === 'object') {
      return { ...(value as EmailSettings) };
    }

    return {};
  }
}
