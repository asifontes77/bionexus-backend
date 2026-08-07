import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Not, Repository } from 'typeorm';
import { CreateSecurityRoleDto } from './dto/create-security-role.dto';
import { UpdateSecurityRoleDto } from './dto/update-security-role.dto';
import { ReplaceRolePermissionsDto } from './dto/replace-role-permissions.dto';
import { ReplaceUserRolesDto } from './dto/replace-user-roles.dto';
import { SecurityPermission } from './entities/security-permission.entity';
import { SecurityRole } from './entities/security-role.entity';
import { SecurityRolePermission } from './entities/security-role-permission.entity';
import { User } from '../users/users.entity';
import { SecurityUserRole } from './entities/security-user-role.entity';
import { SecurityUserPermissionOverride } from './entities/security-user-permission-override.entity';
import { AuthorizationService } from './authorization.service';
import { AuthorizationUserAdministration } from './models/authorization-user-administration';
import { toSafeUserResponse } from '../users/responses/user-response.mapper';

@Injectable()
export class AuthorizationAdministrationService {
  constructor(
    @InjectRepository(SecurityRole)
    private readonly rolesRepository: Repository<SecurityRole>,
    @InjectRepository(SecurityPermission)
    private readonly permissionsRepository: Repository<SecurityPermission>,
    @InjectRepository(SecurityRolePermission)
    private readonly rolePermissionsRepository: Repository<SecurityRolePermission>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(SecurityUserRole)
    private readonly userRolesRepository: Repository<SecurityUserRole>,
    @InjectRepository(SecurityUserPermissionOverride)
    private readonly userPermissionOverridesRepository: Repository<SecurityUserPermissionOverride>,
    private readonly authorizationService: AuthorizationService,
    private readonly dataSource: DataSource,
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

  async replaceRolePermissions(
    roleId: number,
    dto: ReplaceRolePermissionsDto,
  ): Promise<SecurityPermission[]> {
    if (!Number.isInteger(roleId) || roleId <= 0) {
      throw new BadRequestException('ROLE_ID_INVALID');
    }

    if (!dto || typeof dto !== 'object') {
      throw new BadRequestException('PERMISSION_IDS_REQUIRED');
    }

    if (!Array.isArray(dto.permissionIds)) {
      throw new BadRequestException('PERMISSION_IDS_REQUIRED');
    }

    const normalizedPermissionIds: number[] = [];

    for (const permissionId of dto.permissionIds) {
      if (!Number.isInteger(permissionId) || permissionId <= 0) {
        throw new BadRequestException('PERMISSION_ID_INVALID');
      }

      if (!normalizedPermissionIds.includes(permissionId)) {
        normalizedPermissionIds.push(permissionId);
      }
    }

    return this.dataSource.transaction(async (manager) => {
      const transactionalRolesRepository = manager.getRepository(SecurityRole);
      const transactionalPermissionsRepository = manager.getRepository(SecurityPermission);
      const transactionalRolePermissionsRepository = manager.getRepository(SecurityRolePermission);

      const role = await transactionalRolesRepository.findOne({
        where: { id: roleId },
      });

      if (!role) {
        throw new NotFoundException('ROLE_NOT_FOUND');
      }

      let selectedPermissions: SecurityPermission[] = [];

      if (normalizedPermissionIds.length > 0) {
        selectedPermissions = await transactionalPermissionsRepository.find({
          where: {
            id: In(normalizedPermissionIds),
            isActive: true,
          },
          select: {
            id: true,
            code: true,
            module: true,
            isActive: true,
          },
        });

        if (selectedPermissions.length !== normalizedPermissionIds.length) {
          throw new BadRequestException('PERMISSIONS_NOT_FOUND_OR_INACTIVE');
        }
      }

      if (role.code === 'admin') {
        const essentialPermissions = [
          'security.permissions.read',
          'security.roles.assign-permissions',
          'security.roles.create',
          'security.roles.read',
          'security.roles.update',
          'security.users.assign-permissions',
          'security.users.assign-roles',
          'security.users.create',
          'security.users.read',
          'security.users.update',
        ];

        const selectedCodes = selectedPermissions.map((p) => p.code);
        const hasAllEssential = essentialPermissions.every((code) => selectedCodes.includes(code));

        if (!hasAllEssential) {
          throw new ForbiddenException('ADMIN_ESSENTIAL_PERMISSIONS_REQUIRED');
        }
      }

      await transactionalRolePermissionsRepository.delete({ roleId });

      if (normalizedPermissionIds.length > 0) {
        const newAssignments = normalizedPermissionIds.map((permissionId) => ({
          roleId,
          permissionId,
        }));
        await transactionalRolePermissionsRepository.save(newAssignments);
      }

      return selectedPermissions.sort((a, b) => {
        if (a.module !== b.module) {
          return a.module.localeCompare(b.module);
        }
        return a.code.localeCompare(b.code);
      });
    });
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

  async getUserAuthorization(userId: number): Promise<AuthorizationUserAdministration> {
    if (!Number.isInteger(userId) || userId <= 0) {
      throw new BadRequestException('USER_ID_INVALID');
    }

    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('USER_NOT_FOUND');
    }

    const userRoles = await this.userRolesRepository.find({ where: { userId } });
    const userRoleIds = Array.from(
      new Set(
        userRoles
          .map((assignment) => assignment.roleId)
          .filter(
            (roleId) =>
              Number.isInteger(roleId) && roleId > 0,
          ),
      ),
    );

    let assignedRoles: SecurityRole[] = [];
    if (userRoleIds.length > 0) {
      assignedRoles = await this.rolesRepository.find({
        where: { id: In(userRoleIds) },
      });
      assignedRoles.sort((a, b) => a.code.localeCompare(b.code));
    }

    const activeRoleIds = assignedRoles.filter((r) => r.isActive).map((r) => r.id);
    let inheritedPermissions: SecurityPermission[] = [];

    if (activeRoleIds.length > 0) {
      const rolePermissions = await this.rolePermissionsRepository.find({
        where: { roleId: In(activeRoleIds) },
      });
      const inheritedPermissionIds = Array.from(
        new Set(
          rolePermissions
            .map((assignment) => assignment.permissionId)
            .filter(
              (permissionId) =>
                Number.isInteger(permissionId) &&
                permissionId > 0,
            ),
        ),
      );

      if (inheritedPermissionIds.length > 0) {
        inheritedPermissions = await this.permissionsRepository.find({
          where: { id: In(inheritedPermissionIds), isActive: true },
        });
        inheritedPermissions.sort((a, b) => {
          if (a.module === b.module) {
            return a.code.localeCompare(b.code);
          }
          return a.module.localeCompare(b.module);
        });
      }
    }

    const overrides = await this.userPermissionOverridesRepository.find({ where: { userId } });
    const overridePermissionIds = Array.from(
      new Set(
        overrides
          .map((override) => override.permissionId)
          .filter(
            (permissionId) =>
              Number.isInteger(permissionId) &&
              permissionId > 0,
          ),
      ),
    );

    let permissionOverrides = [];
    if (overridePermissionIds.length > 0) {
      const overridePermissions = await this.permissionsRepository.find({
        where: { id: In(overridePermissionIds) },
      });

      permissionOverrides = overrides
        .map((override) => {
          const permission = overridePermissions.find((p) => p.id === override.permissionId);
          if (!permission) return null;
          return {
            permission,
            effect: override.effect,
          };
        })
        .filter((override) => override !== null);

      permissionOverrides.sort((a, b) => {
        if (a.permission.module === b.permission.module) {
          if (a.permission.code === b.permission.code) {
             return a.effect.localeCompare(b.effect);
          }
          return a.permission.code.localeCompare(b.permission.code);
        }
        return a.permission.module.localeCompare(b.permission.module);
      });
    }

    const context = await this.authorizationService.resolveContext(userId);

    return {
      user: toSafeUserResponse(user),
      assignedRoles,
      inheritedPermissions,
      permissionOverrides,
      context,
    };
  }

  async replaceUserRoles(
    userId: number,
    dto: ReplaceUserRolesDto,
  ): Promise<SecurityRole[]> {
    if (!Number.isInteger(userId) || userId <= 0) {
      throw new BadRequestException('USER_ID_INVALID');
    }

    if (!dto || typeof dto !== 'object') {
      throw new BadRequestException('ROLE_IDS_REQUIRED');
    }

    if (!Array.isArray(dto.roleIds)) {
      throw new BadRequestException('ROLE_IDS_REQUIRED');
    }

    const normalizedRoleIds: number[] = [];

    for (const roleId of dto.roleIds) {
      if (!Number.isInteger(roleId) || roleId <= 0) {
        throw new BadRequestException('ROLE_ID_INVALID');
      }

      if (!normalizedRoleIds.includes(roleId)) {
        normalizedRoleIds.push(roleId);
      }
    }

    return this.dataSource.transaction(async (manager) => {
      const transactionalUserRepository = manager.getRepository(User);
      const transactionalRolesRepository = manager.getRepository(SecurityRole);
      const transactionalUserRolesRepository = manager.getRepository(SecurityUserRole);

      const user = await transactionalUserRepository.findOne({
        where: { id: userId },
      });

      if (!user) {
        throw new NotFoundException('USER_NOT_FOUND');
      }

      let selectedRoles: SecurityRole[] = [];

      if (normalizedRoleIds.length > 0) {
        selectedRoles = await transactionalRolesRepository.find({
          where: {
            id: In(normalizedRoleIds),
            isActive: true,
          },
          select: {
            id: true,
            code: true,
            name: true,
            description: true,
            isSystem: true,
            isActive: true,
          },
        });

        if (selectedRoles.length !== normalizedRoleIds.length) {
          throw new BadRequestException('ROLES_NOT_FOUND_OR_INACTIVE');
        }
      }

      const currentUserRoles = await transactionalUserRolesRepository.find({
        where: { userId },
      });

      const currentRoleIds = currentUserRoles.map(
        (assignment) => assignment.roleId,
      );

      const adminRole = await transactionalRolesRepository.findOne({
        where: { code: 'admin', isActive: true },
      });

      if (adminRole) {
        const hadAdminRole = currentRoleIds.includes(adminRole.id);
        const willHaveAdminRole = normalizedRoleIds.includes(adminRole.id);

        if (hadAdminRole && !willHaveAdminRole) {
          const otherAdminAssignments = await transactionalUserRolesRepository.find({
            where: { roleId: adminRole.id, userId: Not(userId) },
          });

          const otherAdminUserIds = Array.from(
            new Set(
              otherAdminAssignments
                .map((assignment) => assignment.userId)
                .filter(
                  (otherUserId) =>
                    Number.isInteger(otherUserId) &&
                    otherUserId > 0,
                ),
            ),
          );

          let hasOtherActiveAdmin = false;
          if (otherAdminUserIds.length > 0) {
            const activeAdminsCount = await transactionalUserRepository.count({
              where: {
                id: In(otherAdminUserIds),
                hide_user: false,
              },
            });
            hasOtherActiveAdmin = activeAdminsCount > 0;
          }

          if (!hasOtherActiveAdmin) {
            throw new ForbiddenException('LAST_ADMIN_ROLE_REQUIRED');
          }
        }
      }

      await transactionalUserRolesRepository.delete({ userId });

      if (normalizedRoleIds.length > 0) {
        const newAssignments = normalizedRoleIds.map((roleId) => ({
          userId,
          roleId,
        }));
        await transactionalUserRolesRepository.save(newAssignments);
      }

      return selectedRoles.sort((a, b) => a.code.localeCompare(b.code));
    });
  }
}
