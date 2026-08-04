import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { listGerms } from './list_germs.entity';
import { Repository } from 'typeorm';
import { CreateList_germsDto } from './dto/create-list_germs.dto';
import { UpdateList_germsDto } from './dto/update-list_germs.dto';

@Injectable()
export class ListGermsService {
  constructor(
    @InjectRepository(listGerms)
    private listGermsRepository: Repository<listGerms>,
  ) {}

  async geListGerms() {
    return this.listGermsRepository.find();
  }

  async getListGermsOrder() {
    const listGermsFound = this.listGermsRepository.find({
      order: {
        germen: 'ASC',
      },
    });
    return listGermsFound;
  }

  async getGerm(id: number) {
    const germFound = this.listGermsRepository.findOne({
      where: {
        id,
      },
    });
    if (!germFound) {
      return new HttpException('Germen no encontrado', HttpStatus.NOT_FOUND);
    }
    return germFound;
  }

  async createGerm(listGerm: CreateList_germsDto) {
    const newExam = this.listGermsRepository.create(listGerm);
    return this.listGermsRepository.save(newExam);
  }
  

  async updateGerm(id: number, germ: UpdateList_germsDto) {
    const germFound = await this.listGermsRepository.findOne({
      where: {
        id,
      },
    });
    if (!germFound) {
      return new HttpException('Germen no encontrado', HttpStatus.NOT_FOUND);
    }
    const updateGerm = Object.assign(germFound, germ);
    return this.listGermsRepository.save(updateGerm);
  }
}
