import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Antibiotic } from './antibiotic.entity';
import { Repository } from 'typeorm';
import { CreateAntibioticDto } from './dto/create-antibiotic.dto';
import { UpdateAntibioticDto } from './dto/update-antibiotic.dto';

@Injectable()
export class AntibioticService {
  constructor(
    @InjectRepository(Antibiotic)
    private antibioticRepository: Repository<Antibiotic>,
  ) {}

  async getAntibioticLists() {
    return this.antibioticRepository.find();
  }

  async getAntibioticListsOrder() {
    const examListFound = this.antibioticRepository.find({
      where: {
        annulled: false,
      },
      order: {
        description: 'ASC',
      },
    });
    if (!examListFound) {
      return new HttpException('examen no encontrado', HttpStatus.NOT_FOUND);
    }
    return examListFound;
  }

  async getAntibiotic(id: number) {
    const antibioticFound = this.antibioticRepository.findOne({
      where: {
        id,
      },
    });
    if (!antibioticFound) {
      return new HttpException(
        'antibiotico no encontrado',
        HttpStatus.NOT_FOUND,
      );
    }
    return antibioticFound;
  }

  async createAntibiotic(antibiotic: CreateAntibioticDto) {
    const newAntibiotic = this.antibioticRepository.create(antibiotic);
    return this.antibioticRepository.save(newAntibiotic);
  }

  async updateAntibiotic(id: number, antibiotic: UpdateAntibioticDto) {
    const antibioticFound = await this.antibioticRepository.findOne({
      where: {
        id,
      },
    });
    if (!antibioticFound) {
      return new HttpException(
        'antibiotico no encontrado',
        HttpStatus.NOT_FOUND,
      );
    }
    const updateAntibiotic = Object.assign(antibioticFound, antibiotic);
    return this.antibioticRepository.save(updateAntibiotic);
  }
}
