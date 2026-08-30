import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './users.entity';
import { DataSource, EntityManager, In, Repository, Not } from 'typeorm';
import { CreateUsersDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { LoginUserDto } from './dto/login-user.dto';
import { JwtService } from '@nestjs/jwt';
import { LaboratoryService } from '../laboratory/laboratory.service';
import { LicenseService } from '../license/license.service';
import * as bcrypt from 'bcrypt';
import { ForbiddenException, MethodNotAllowedException, Optional } from '@nestjs/common';
import { SecurityRole } from '../authorization/entities/security-role.entity';
import { SecurityUserRole } from '../authorization/entities/security-user-role.entity';
import { SecurityAuditService } from '../audit/security-audit.service';
import { normalizeUserEmail } from './user-email';
import {
  SafeUserResponse,
  toSafeUserResponse,
  toSafeUserResponses,
} from './responses/user-response.mapper';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private usersRepository: Repository<User>,
    private jwtUserService: JwtService,
    private readonly laboratoryService: LaboratoryService,
    private readonly LicenseService: LicenseService,
  @Optional() private readonly dataSource?: DataSource,
  @Optional() private readonly securityAuditService?: SecurityAuditService,
  ) {}

async createUser(
    users: CreateUsersDto,
    actorUserId?: number,
  ): Promise<any> {
    if (actorUserId === undefined) {
      return this.createUserWithRepository(this.usersRepository, users);
    }
    if (!this.dataSource) throw new Error('USER_TRANSACTION_UNAVAILABLE');
    return this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(User);
      const result = await this.createUserWithRepository(repository, users);
      await this.writeUserAudit(manager, actorUserId, {
        action: 'security.user.created',
        entityId: result.id,
        summary: 'Usuario creado',
        metadata: { userName: result.user_name },
      });
      return result;
    });
  }

  async getUsers(): Promise<SafeUserResponse[]> {
    const users = await this.usersRepository.find();

    return toSafeUserResponses(users);
  }

  async getUsersOrder(): Promise<SafeUserResponse[]> {
    const users = await this.usersRepository.find({
      order: {
        name: 'ASC',
      },
    });

    return toSafeUserResponses(users);
  }

  async getSignatureUsers(): Promise<SafeUserResponse[]> {
    const users = await this.usersRepository
      .createQueryBuilder('entidad')
      .where('entidad.college_number != :valorVacio', { valorVacio: '' })
      .getMany();

    return toSafeUserResponses(users);
  }

  async getUser(id: number) {
    const userFound = await this.usersRepository.findOne({
      where: {
        id,
      },
    });

    if (!userFound) {
      return new HttpException('Usuario no encontrado', HttpStatus.NOT_FOUND);
    }

    return toSafeUserResponse(userFound);
  }

  async verifyEmail(email: string) {
    const normalizedEmail = normalizeUserEmail(email);
    const userFound = await this.usersRepository.findOne({
      where: {
        email: normalizedEmail,
      },
    });
    return userFound;
  }

  async verifyEmailId(id: number, email: string) {
    const normalizedEmail = normalizeUserEmail(email);
    const userFound = await this.usersRepository.findOne({
      where: {
        id: Not(id),
        email: normalizedEmail,
      },
    });
    return userFound;
  }

  async verifySignature(id: number, passwordSignature: string) {
    const userFound = await this.usersRepository.findOne({
      where: {
        id,
      },
    });
    if (!userFound) {
      return new HttpException('USER_NOT_FOUND', HttpStatus.NOT_FOUND);
    }
    const compare = await bcrypt.compareSync(
      passwordSignature,
      userFound.passwordSignature,
    );
    if (!compare) {
      return new HttpException('PASSWORD_INVALID', HttpStatus.NOT_FOUND);
    }

    const payload = {
      id: id,
      name: userFound.name,
      college_number: userFound.college_number,
    };

    const dataUser = {
      user: payload,
    };
    return dataUser;
  }

  async getUserSession(userLogin: LoginUserDto) {
    const { user_name, password } = userLogin;
    const laboratoryFound = await this.laboratoryService.getLaboratory(1);
    const row = JSON.parse(JSON.stringify(laboratoryFound));
    const license = await this.LicenseService.validateLicenseKey(
      row.rif,
      row.business_name,
      row.license,
    );
    if (!license) {
      return new HttpException('INVALID_LICENSE_KEY', HttpStatus.FORBIDDEN);
    }
    const userFound = await this.usersRepository.findOne({
      where: {
        user_name,
      },
    });

    if (!userFound) {
      return new HttpException('USER_NOT_FOUND', HttpStatus.NOT_FOUND);
    }
    const compare = await bcrypt.compareSync(password, userFound.password);
    if (!compare) {
      return new HttpException('PASSWORD_INVALID', HttpStatus.NOT_FOUND);
    }

    const payload = { id: userFound.id, name: userFound.name };
    const token = await this.jwtUserService.sign(payload);

    const dataUser = {
      user: toSafeUserResponse(userFound),
      token,
    };
    return dataUser;
  }

  async renewUserSession(userId: number) {
    if (!Number.isInteger(userId) || userId <= 0) {
      throw new HttpException('USER_ID_INVALID', HttpStatus.BAD_REQUEST);
    }
    const userFound = await this.usersRepository.findOne({ where: { id: userId } });
    if (!userFound || userFound.hide_user) {
      throw new HttpException('USER_NOT_FOUND', HttpStatus.NOT_FOUND);
    }
    const payload = { id: userFound.id, name: userFound.name };
    const token = await this.jwtUserService.sign(payload);
    return { user: toSafeUserResponse(userFound), token };
  }
  async deleteUser(_id: number): Promise<never> {
    throw new MethodNotAllowedException('USER_PHYSICAL_DELETE_DISABLED');
  }

async updateUser(
    id: number,
    user: UpdateUserDto,
    actorUserId?: number,
  ): Promise<SafeUserResponse> {
    if (actorUserId === undefined && user.hide_user === undefined) {
      return this.updateUserWithRepository(this.usersRepository, id, user);
    }
    if (!this.dataSource) {
      throw new Error('USER_STATE_TRANSACTION_UNAVAILABLE');
    }
    return this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(User);
      const existing = await repository.findOne({ where: { id } });
      if (!existing) {
        return new HttpException('Usuario no encontrado', HttpStatus.NOT_FOUND) as never;
      }
      const previousHidden = Boolean(existing.hide_user);
      if (user.hide_user === true && previousHidden !== true) {
        await this.assertCanHideUser(manager, existing.id);
      }
      const result = await this.updateUserWithRepository(
        repository, id, user, existing,
      );
      if (actorUserId !== undefined) {
        const action = user.hide_user === true && previousHidden !== true
          ? 'security.user.deactivated'
          : user.hide_user === false && previousHidden === true
            ? 'security.user.activated'
            : 'security.user.updated';
        await this.writeUserAudit(manager, actorUserId, {
          action,
          entityId: id,
          summary: action === 'security.user.updated'
            ? 'Usuario actualizado'
            : action === 'security.user.activated'
              ? 'Usuario activado'
              : 'Usuario inactivado',
          metadata: {
            userName: result.user_name,
            changedFields: this.getSafeUserChangedFields(user),
          },
        });
      }
      return result;
    });
  }

  private async assertCanHideUser(
    manager: EntityManager,
    userId: number,
  ): Promise<void> {
    const rolesRepository = manager.getRepository(SecurityRole);
    const userRolesRepository = manager.getRepository(SecurityUserRole);
    const usersRepository = manager.getRepository(User);

    const adminRole = await rolesRepository.findOne({
      where: { code: 'admin', isActive: true },
      select: { id: true },
    });

    if (!adminRole) return;

    const currentAdminAssignment = await userRolesRepository.findOne({
      where: { userId, roleId: adminRole.id },
      select: { userId: true, roleId: true },
    });

    if (!currentAdminAssignment) return;

    const otherAssignments = await userRolesRepository.find({
      where: { roleId: adminRole.id, userId: Not(userId) },
      select: { userId: true },
    });

    const otherAdminUserIds = Array.from(
      new Set(
        otherAssignments
          .map((assignment) => assignment.userId)
          .filter((id) => Number.isInteger(id) && id > 0),
      ),
    );

    const otherVisibleAdmins = otherAdminUserIds.length === 0
      ? 0
      : await usersRepository.count({
          where: { id: In(otherAdminUserIds), hide_user: false },
        });

    if (otherVisibleAdmins === 0) {
      throw new ForbiddenException('LAST_ACTIVE_ADMIN_REQUIRED');
    }
  }

  private async updateUserWithRepository(
    repository: Repository<User>,
    id: number,
    user: UpdateUserDto,
    existingUser?: User,
  ): Promise<SafeUserResponse> {
    const userFound = existingUser ?? await repository.findOne({
      where: { id },
    });

    if (!userFound) {
      return new HttpException('Usuario no encontrado', HttpStatus.NOT_FOUND) as never;
    }

    if (user.email !== undefined) {
      user.email = normalizeUserEmail(user.email);
    }

    if (
      user.user_name !== undefined &&
      user.user_name !== userFound.user_name
    ) {
      const duplicatedUser = await repository.findOne({
        where: {
          id: Not(id),
          user_name: user.user_name,
        },
      });

      if (duplicatedUser) {
        return new HttpException(
          'Ya existe un usuario con ese nombre de usuario',
          HttpStatus.CONFLICT,
        ) as never;
      }
    }

    if (user.password !== undefined) {
      user.password = await bcrypt.hash(user.password, 8);
    }

    if (user.passwordSignature !== undefined) {
      user.passwordSignature = await bcrypt.hash(user.passwordSignature, 8);
    }

    const updatedUser = Object.assign(userFound, user);
    const savedUser = await repository.save(updatedUser);
    return toSafeUserResponse(savedUser);
  }
  private async createUserWithRepository(
    repository: Repository<User>,
    users: CreateUsersDto,
  ): Promise<any> {
    users.email = normalizeUserEmail(users.email);
    const existingUserName = await repository.findOne({
      where: { user_name: users.user_name },
    });
    if (existingUserName) {
      throw new HttpException(
        'Ya existe un usuario con ese nombre de usuario',
        HttpStatus.CONFLICT,
      );
    }

    const existingEmail = await repository.findOne({
      where: { email: users.email },
    });
    if (existingEmail) {
      throw new HttpException(
        'Ya existe un usuario con ese correo electronico',
        HttpStatus.CONFLICT,
      );
    }

    const payload = { ...users };
    if (payload.password !== undefined) {
      payload.password = await bcrypt.hash(payload.password, 8);
    }

    try {
      const savedUser = await repository.save(payload);
      return toSafeUserResponse(savedUser);
    } catch (error) {
      const databaseError = error as { code?: string; errno?: number };
      if (databaseError.code === 'ER_DUP_ENTRY' || databaseError.errno === 1062) {
        throw new HttpException(
          'Ya existe un usuario con ese nombre de usuario o correo electronico',
          HttpStatus.CONFLICT,
        );
      }
      throw error;
    }
  }
  private async writeUserAudit(
    manager: EntityManager,
    actorUserId: number,
    input: {
      action: string;
      entityId: number;
      summary: string;
      metadata: Record<string, unknown>;
    },
  ): Promise<void> {
    if (!this.securityAuditService) {
      throw new Error('SECURITY_AUDIT_SERVICE_UNAVAILABLE');
    }
    await this.securityAuditService.write(manager, {
      actorUserId,
      entityType: 'user',
      ...input,
    });
  }

  private getSafeUserChangedFields(user: UpdateUserDto): string[] {
    const forbidden = new Set([
      'password',
      'passwordSignature',
      'key_signing',
      'key_recover',
      'request_password',
    ]);
    return Object.keys(user).filter(
      (field) => user[field as keyof UpdateUserDto] !== undefined && !forbidden.has(field),
    );
  }

}
