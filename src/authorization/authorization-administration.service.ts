import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateSecurityRoleDto } from './dto/create-security-role.dto';
import { UpdateSecurityRoleDto } from './dto/update-security-role.dto';
import { SecurityPermission } from './entities/security-permission.entity';
import { SecurityRole } from './entities/security-role.entity';

@Injectable()
export class AuthorizationAdministrationService {
  constructor(
    @InjectRepository(SecurityRole)
    private readonly rolesRepository: Repository<SecurityRole>,
    @InjectRepository(SecurityPermission)
    private readonly permissionsRepository: Repository<SecurityPermission>,
  ) {}

  async getRoles(): Promise<SecurityRole[]> {
    return this.rolesRepository.find({
      order: {
        code: 'ASC',
      },
    });
  }

  async getPermissions(): Promise<SecurityPermission[]> {
    return this.permissionsRepository.find({
      order: {
        module: 'ASC',
        code: 'ASC',
      },
    });
  }
  async updateRole(
    roleId: number,
    dto: UpdateSecurityRoleDto,
  ): Promise<SecurityRole> {
    if (!Number.isInteger(roleId) || roleId <= 0) {
      throw new BadRequestException('ROLE_ID_INVALID');
    }

    if (!dto || typeof dto !== 'object') {
      throw new BadRequestException('ROLE_UPDATE_REQUIRED');
    }

    const payload = dto as UpdateSecurityRoleDto & {
      code?: unknown;
      isSystem?: unknown;
    };

    if (payload.code !== undefined) {
      throw new BadRequestException('ROLE_CODE_IMMUTABLE');
    }

    if (payload.isSystem !== undefined) {
      throw new BadRequestException('ROLE_SYSTEM_FLAG_IMMUTABLE');
    }

    const hasName = dto.name !== undefined;
    const hasDescription = dto.description !== undefined;
    const hasActiveState = dto.isActive !== undefined;

    if (
      !hasName &&
      !hasDescription &&
      !hasActiveState
    ) {
      throw new BadRequestException('ROLE_UPDATE_REQUIRED');
    }

    const role = await this.rolesRepository.findOne({
      where: {
        id: roleId,
      },
    });

    if (!role) {
      throw new NotFoundException('ROLE_NOT_FOUND');
    }

    if (hasName) {
      role.name = this.normalizeRequiredText(
        dto.name as string,
        'ROLE_NAME_REQUIRED',
        100,
        'ROLE_NAME_TOO_LONG',
      );
    }

    if (hasDescription) {
      role.description = this.normalizeOptionalText(
        dto.description,
        250,
        'ROLE_DESCRIPTION_TOO_LONG',
      );
    }

    if (hasActiveState) {
      if (typeof dto.isActive !== 'boolean') {
        throw new BadRequestException(
          'ROLE_ACTIVE_STATE_INVALID',
        );
      }

      if (
        role.code === 'admin' &&
        dto.isActive === false
      ) {
        throw new ForbiddenException(
          'ADMIN_ROLE_MUST_REMAIN_ACTIVE',
        );
      }

      role.isActive = dto.isActive;
    }

    return this.rolesRepository.save(role);
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
