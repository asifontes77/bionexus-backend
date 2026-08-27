import {
  BadRequestException,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { SecurityAuditService } from '../audit/security-audit.service';
import { UpdateLaboratoryDto } from './dto/update-laboratorio.dto';
import { Laboratory } from './laboratory.entity';

type EmailSettings = {
  isGmail?: boolean;
  host?: string;
  port?: number | null;
  secure?: boolean;
  user?: string;
  pass?: string;
  from?: string;
};

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
    }
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
      sendEmail: incomingEmail as unknown as JSON,
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
