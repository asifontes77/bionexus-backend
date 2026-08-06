import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Groupht } from './group_ht.entity';
import { Repository, Like } from 'typeorm';
import { CreateGroup_htDto } from './dto/create-group_ht.dto';
import { UpdateGroup_htDto } from './dto/update-group_ht.dto';

@Injectable()
export class GroupHtService {
  constructor(
    @InjectRepository(Groupht) private group_htRepository: Repository<Groupht>,
  ) {}

  async getGroupHtList() {
    return this.group_htRepository.find();
  }

  async getGroupHtListActive() {
    return this.group_htRepository.find({
      where: {
        annulled: false,
      },
      relations: {
        grouphtitems: true,
      },
    });
  }

  async countWithLike(description: string) {
    return this.group_htRepository.count({
      where: {
        description: Like(`%${description}%`),
      },
    });
  }

  async getGroupHt(id: number) {
    const groupHtFound = this.group_htRepository.findOne({
      where: {
        id,
      },
      relations: {
        grouphtitems: true,
      },
    });
    if (!groupHtFound) {
      return new HttpException('grupo HT no encontrado', HttpStatus.NOT_FOUND);
    }
    return groupHtFound;
  }

  async createGroupHt(groupHt: CreateGroup_htDto) {
    const newGroupHt = this.group_htRepository.create(groupHt);
    return this.group_htRepository.save(newGroupHt);
  }

  async updateGroupHt(id: number, groupHt: UpdateGroup_htDto) {
    const groupHtFound = await this.group_htRepository.findOne({
      where: {
        id,
      },
    });
    if (!groupHtFound) {
      return new HttpException('grupo ht no encontrado', HttpStatus.NOT_FOUND);
    }
    const updateGroupHt = Object.assign(groupHtFound, groupHt);
    return this.group_htRepository.save(updateGroupHt);
  }

  async deleteGroupHt(id: number) {
    const groupHtFound = await this.group_htRepository.findOne({
      where: {
        id,
      },
      relations: {
        grouphtitems: true,
      },
    });
    if (!groupHtFound) {
      return new HttpException('grupo ht no encontrado', HttpStatus.NOT_FOUND);
    }
    await this.group_htRepository.remove(groupHtFound);
    return true;
  }

  async getGroupList() {
    return this.group_htRepository
      .createQueryBuilder('groupht')
      .leftJoinAndSelect('groupht.grouphtitems', 'grouphtitems')
      .where('groupht.annulled = false')
      .orderBy('groupht.description', 'ASC')
      .addOrderBy('grouphtitems.id', 'ASC')
      .getMany();
  }
}
