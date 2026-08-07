import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateSecurityRoleDto } from './dto/create-security-role.dto';
import { SecurityRole } from './entities/security-role.entity';

@Injectable()
export class AuthorizationAdministrationService {
  constructor(
    @InjectRepository(SecurityRole)
    private readonly rolesRepository: Repository<SecurityRole>,
  ) {}

  async getRoles(): Promise<SecurityRole[]> {
    return this.rolesRepository.find({
      order: {
        code: 'ASC',
      },
    });
  }

  async createRole(
    dto: CreateSecurityRoleDto,
  ): Promise<SecurityRole> {
    const code = this.normalizeCode(dto?.code);
    const name = this.normalizeRequiredText(
      dto?.name,
      'ROLE_NAME_REQUIRED',
      100,
      'ROLE_NAME_TOO_LONG',
    );

    const description = this.normalizeOptionalText(
      dto?.description,
      250,
      'ROLE_DESCRIPTION_TOO_LONG',
    );

    const existingRole = await this.rolesRepository.findOne({
      where: {
        code,
      },
      select: {
        id: true,
      },
    });

    if (existingRole) {
      throw new ConflictException('ROLE_CODE_ALREADY_EXISTS');
    }

    const role = this.rolesRepository.create({
      code,
      name,
      description,
      isSystem: false,
      isActive: true,
    });

    return this.rolesRepository.save(role);
  }

  private normalizeCode(value: string): string {
    if (typeof value !== 'string') {
      throw new BadRequestException('ROLE_CODE_REQUIRED');
    }

    const normalizedValue = value.trim().toLowerCase();

    if (normalizedValue === '') {
      throw new BadRequestException('ROLE_CODE_REQUIRED');
    }

    if (normalizedValue.length > 60) {
      throw new BadRequestException('ROLE_CODE_TOO_LONG');
    }

    if (!/^[a-z][a-z0-9._-]*$/.test(normalizedValue)) {
      throw new BadRequestException('ROLE_CODE_INVALID');
    }

    return normalizedValue;
  }

  private normalizeRequiredText(
    value: string,
    requiredError: string,
    maximumLength: number,
    lengthError: string,
  ): string {
    if (typeof value !== 'string') {
      throw new BadRequestException(requiredError);
    }

    const normalizedValue = value.trim();

    if (normalizedValue === '') {
      throw new BadRequestException(requiredError);
    }

    if (normalizedValue.length > maximumLength) {
      throw new BadRequestException(lengthError);
    }

    return normalizedValue;
  }

  private normalizeOptionalText(
    value: string | null | undefined,
    maximumLength: number,
    lengthError: string,
  ): string | null {
    if (value === undefined || value === null) {
      return null;
    }

    if (typeof value !== 'string') {
      throw new BadRequestException(lengthError);
    }

    const normalizedValue = value.trim();

    if (normalizedValue === '') {
      return null;
    }

    if (normalizedValue.length > maximumLength) {
      throw new BadRequestException(lengthError);
    }

    return normalizedValue;
  }
}
