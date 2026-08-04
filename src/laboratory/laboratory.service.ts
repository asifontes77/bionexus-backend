import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Laboratory } from './laboratory.entity';
import { Repository } from 'typeorm';
import { UpdateLaboratoryDto } from './dto/update-laboratorio.dto';

@Injectable()
export class LaboratoryService {
  constructor(
    @InjectRepository(Laboratory)
    private laboratoryRepository: Repository<Laboratory>,
  ) {}

  async getLaboratory(id: number) {
    const laboratoryFound = this.laboratoryRepository.findOne({
      where: {
        id,
      },
    });
    if (!laboratoryFound) {
      return new HttpException(
        'Laboratorio no encontrado',
        HttpStatus.NOT_FOUND,
      );
    }
    return laboratoryFound;
  }

  async getLaboratorySetting() {
    const query = this.laboratoryRepository
      .createQueryBuilder('entity')
      .limit(1);

    return query.getMany();
  }

  async updateLaboratory(id: number, laboratory: UpdateLaboratoryDto) {
    const laboratoryFound = await this.laboratoryRepository.findOne({
      where: {
        id,
      },
    });
    if (!laboratoryFound) {
      return new HttpException(
        'Laboeatorio no encontrado',
        HttpStatus.NOT_FOUND,
      );
    }
    const updateLaboratory = Object.assign(laboratoryFound, laboratory);
    return this.laboratoryRepository.save(updateLaboratory);
  }
}
