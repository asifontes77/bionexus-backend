import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Parasiticforms } from './parasiticforms.entity';
import { Repository } from 'typeorm';
import { CreateParasiticformsDto } from './dto/create-parasiticforms.dto';
import { UpdateparasiticformsDto } from './dto/update-parasiticforms.dto';

@Injectable()
export class ParasiticformsService {
  constructor(
    @InjectRepository(Parasiticforms)
    private parasiticformsRepository: Repository<Parasiticforms>,
  ) {}

  async getParasiticformsLists() {
    return this.parasiticformsRepository.find();
  }

  async getParasiticformsListsOrder() {
    const parasiticformsFound = this.parasiticformsRepository.find({
      where: {
        annulled: false,
      },
      order: {
        description: 'ASC',
      },
    });
    if (!parasiticformsFound) {
      return new HttpException('parasito no encontrado', HttpStatus.NOT_FOUND);
    }
    return parasiticformsFound;
  }

  async getParasiticforms(id: number) {
    const parasiticformsFound = this.parasiticformsRepository.findOne({
      where: {
        id,
      },
    });
    if (!parasiticformsFound) {
      return new HttpException('parasito no encontrado', HttpStatus.NOT_FOUND);
    }
    return parasiticformsFound;
  }

  async createParasiticforms(parasiticforms: CreateParasiticformsDto) {
    const newParasiticforms =
      this.parasiticformsRepository.create(parasiticforms);
    return this.parasiticformsRepository.save(newParasiticforms);
  }

  async updateParasiticforms(id: number, parasitic: UpdateparasiticformsDto) {
    const parasiticformsFound = await this.parasiticformsRepository.findOne({
      where: {
        id,
      },
    });
    if (!parasiticformsFound) {
      return new HttpException('parasito no encontrado', HttpStatus.NOT_FOUND);
    }
    const updateParasiticforms = Object.assign(parasiticformsFound, parasitic);
    return this.parasiticformsRepository.save(updateParasiticforms);
  }
}
