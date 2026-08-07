import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './users.entity';
import { Repository, Not } from 'typeorm';
import { CreateUsersDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { LoginUserDto } from './dto/login-user.dto';
import { JwtService } from '@nestjs/jwt';
import { LaboratoryService } from '../laboratory/laboratory.service';
import { LicenseService } from '../license/license.service';
import * as bcrypt from 'bcrypt';
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
  ) {}

  async createUser(users: CreateUsersDto): Promise<any> {
    const userFond = await this.usersRepository.findOne({
      where: {
        user_name: users.user_name,
      },
    });

    if (userFond) {
      return new HttpException(
        'Ya existe un usuario con ese nombre de usuario',
        HttpStatus.CONFLICT,
      );
    }

    if (users.password !== undefined) {
      const password = users.password;
      const passwordHash = await bcrypt.hash(password, 8);
      users.password = passwordHash;
    }
    const savedUser = await this.usersRepository.save(users);

    return toSafeUserResponse(savedUser);
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
    const userFound = await this.usersRepository.findOne({
      where: {
        email,
      },
    });
    return userFound;
  }

  async verifyEmailId(id: number, email: string) {
    const userFound = await this.usersRepository.findOne({
      where: {
        id: Not(id),
        email,
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

  async deleteUser(id: number) {
    const result = await this.usersRepository.delete({ id });
    if (result.affected === 0) {
      return new HttpException('Usuario no encontrado', HttpStatus.NOT_FOUND);
    }

    return result;
  }

  async updateUser(id: number, user: UpdateUserDto) {
    const userFound = await this.usersRepository.findOne({
      where: {
        id,
      },
    });
    if (!userFound) {
      return new HttpException('Usuario no encontrado', HttpStatus.NOT_FOUND);
    }
    const userFondN = await this.usersRepository.findOne({
      where: {
        id: Not(id),
        user_name: user.user_name,
      },
    });

    if (userFondN) {
      return new HttpException(
        'Ya existe un usuario con ese nombre de usuario',
        HttpStatus.CONFLICT,
      );
    }
    if (user.password !== undefined) {
      const password = user.password;
      const passwordHash = await bcrypt.hash(password, 8);
      user.password = passwordHash;
    }
    if (user.passwordSignature !== undefined) {
      const passwordS = user.passwordSignature;
      const passwordHash = await bcrypt.hash(passwordS, 8);
      user.passwordSignature = passwordHash;
    }
    const updateUser = Object.assign(userFound, user);
    const savedUser = await this.usersRepository.save(updateUser);

    return toSafeUserResponse(savedUser);
  }
}
