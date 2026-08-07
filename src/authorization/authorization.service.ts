import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { User } from '../users/users.entity';
import { SecurityPermission } from './entities/security-permission.entity';
import { SecurityRolePermission } from './entities/security-role-permission.entity';
import { SecurityRole } from './entities/security-role.entity';
import {
  SecurityPermissionEffect,
  SecurityUserPermissionOverride,
} from './entities/security-user-permission-override.entity';
import { SecurityUserRole } from './entities/security-user-role.entity';
import { AuthorizationContext } from './models/authorization-context';

@Injectable()
export class AuthorizationService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    @InjectRepository(SecurityRole)
    private readonly rolesRepository: Repository<SecurityRole>,
    @InjectRepository(SecurityPermission)
    private readonly permissionsRepository: Repository<SecurityPermission>,
    @InjectRepository(SecurityRolePermission)
    private readonly rolePermissionsRepository: Repository<SecurityRolePermission>,
    @InjectRepository(SecurityUserRole)
    private readonly userRolesRepository: Repository<SecurityUserRole>,
    @InjectRepository(SecurityUserPermissionOverride)
    private readonly userOverridesRepository: Repository<SecurityUserPermissionOverride>,
  ) {}

  async resolveContext(userId: number): Promise<AuthorizationContext | null> {
    if (!Number.isInteger(userId) || userId <= 0) {
      return null;
    }

    const user = await this.usersRepository.findOne({
      where: {
        id: userId,
        hide_user: false,
      },
      select: {
        id: true,
      },
    });

    if (!user) {
      return null;
    }

    const userRoleAssignments = await this.userRolesRepository.find({
      where: {
        userId,
      },
      select: {
        roleId: true,
      },
    });

    const roleIds = Array.from(
      new Set(
        userRoleAssignments
          .map((assignment) => assignment.roleId)
          .filter((roleId) => Number.isInteger(roleId) && roleId > 0),
      ),
    );

    const roles =
      roleIds.length === 0
        ? []
        : await this.rolesRepository.find({
            where: {
              id: In(roleIds),
              isActive: true,
            },
            select: {
              id: true,
              code: true,
            },
          });

    const activeRoleIds = roles.map((role) => role.id);

    const rolePermissionAssignments =
      activeRoleIds.length === 0
        ? []
        : await this.rolePermissionsRepository.find({
            where: {
              roleId: In(activeRoleIds),
            },
            select: {
              permissionId: true,
            },
          });

    const overrideAssignments = await this.userOverridesRepository.find({
      where: {
        userId,
      },
      select: {
        permissionId: true,
        effect: true,
      },
    });

    const permissionIds = Array.from(
      new Set([
        ...rolePermissionAssignments.map(
          (assignment) => assignment.permissionId,
        ),
        ...overrideAssignments.map(
          (assignment) => assignment.permissionId,
        ),
      ]),
    ).filter(
      (permissionId) =>
        Number.isInteger(permissionId) && permissionId > 0,
    );

    const activePermissions =
      permissionIds.length === 0
        ? []
        : await this.permissionsRepository.find({
            where: {
              id: In(permissionIds),
              isActive: true,
            },
            select: {
              id: true,
              code: true,
            },
          });

    const permissionCodeById = new Map(
      activePermissions.map((permission) => [
        permission.id,
        permission.code,
      ]),
    );

    const inheritedPermissionCodes = new Set(
      rolePermissionAssignments
        .map((assignment) =>
          permissionCodeById.get(assignment.permissionId),
        )
        .filter((code): code is string => Boolean(code)),
    );

    const allowedPermissionCodes = new Set(
      overrideAssignments
        .filter(
          (assignment) =>
            assignment.effect === SecurityPermissionEffect.Allow,
        )
        .map((assignment) =>
          permissionCodeById.get(assignment.permissionId),
        )
        .filter((code): code is string => Boolean(code)),
    );

    const deniedPermissionCodes = new Set(
      overrideAssignments
        .filter(
          (assignment) =>
            assignment.effect === SecurityPermissionEffect.Deny,
        )
        .map((assignment) =>
          permissionCodeById.get(assignment.permissionId),
        )
        .filter((code): code is string => Boolean(code)),
    );

    const effectivePermissions = new Set([
      ...inheritedPermissionCodes,
      ...allowedPermissionCodes,
    ]);

    for (const deniedPermission of deniedPermissionCodes) {
      effectivePermissions.delete(deniedPermission);
    }

    return {
      userId,
      roles: roles
        .map((role) => role.code)
        .sort((left, right) => left.localeCompare(right)),
      permissions: Array.from(effectivePermissions).sort(
        (left, right) => left.localeCompare(right),
      ),
      deniedPermissions: Array.from(deniedPermissionCodes).sort(
        (left, right) => left.localeCompare(right),
      ),
    };
  }

  async hasPermission(
    userId: number,
    permissionCode: string,
  ): Promise<boolean> {
    const normalizedPermissionCode = this.normalizePermissionCode(
      permissionCode,
    );

    if (normalizedPermissionCode === '') {
      return false;
    }

    const context = await this.resolveContext(userId);

    if (!context) {
      return false;
    }

    if (
      context.deniedPermissions.includes(
        normalizedPermissionCode,
      )
    ) {
      return false;
    }

    return context.permissions.includes(
      normalizedPermissionCode,
    );
  }

  async hasAllPermissions(
    userId: number,
    permissionCodes: string[],
  ): Promise<boolean> {
    const normalizedPermissionCodes = this.normalizePermissionCodes(
      permissionCodes,
    );

    if (normalizedPermissionCodes.length === 0) {
      return true;
    }

    const context = await this.resolveContext(userId);

    if (!context) {
      return false;
    }

    return normalizedPermissionCodes.every(
      (permissionCode) =>
        !context.deniedPermissions.includes(permissionCode) &&
        context.permissions.includes(permissionCode),
    );
  }

  private normalizePermissionCodes(
    permissionCodes: string[],
  ): string[] {
    if (!Array.isArray(permissionCodes)) {
      return [];
    }

    return Array.from(
      new Set(
        permissionCodes
          .map((permissionCode) =>
            this.normalizePermissionCode(permissionCode),
          )
          .filter((permissionCode) => permissionCode !== ''),
      ),
    );
  }

  private normalizePermissionCode(permissionCode: string): string {
    if (typeof permissionCode !== 'string') {
      return '';
    }

    return permissionCode.trim().toLowerCase();
  }
}
