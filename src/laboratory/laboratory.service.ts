import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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
    private laboratoryRepository: Repository<Laboratory>,
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
  ): Promise<Laboratory> {
    this.validateId(id);
    this.validateUpdate(laboratory);

    const laboratoryFound = await this.laboratoryRepository.findOne({
      where: {
        id,
      },
    });

    if (!laboratoryFound) {
      throw new NotFoundException('LABORATORY_NOT_FOUND');
    }

    const changes = this.preserveEmailPassword(laboratoryFound, laboratory);

    const updatedLaboratory = Object.assign(laboratoryFound, changes);

    return this.laboratoryRepository.save(updatedLaboratory);
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
    if (Object.prototype.hasOwnProperty.call(laboratory, 'license')) {
      throw new BadRequestException('LABORATORY_LICENSE_READ_ONLY');
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
