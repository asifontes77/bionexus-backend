import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { SampleType } from './sampletype.entity';
import { Repository } from 'typeorm';
import { CreateSampletypeDto } from './dto/create-sampletype.dto';
import { UpdateSampletypeDto } from './dto/update-sampletype.dto';

@Injectable()
export class SampleTypeService {
  constructor(
    @InjectRepository(SampleType)
    private sampletypeRepository: Repository<SampleType>,
  ) {}

  async createSampletype(sampletype: CreateSampletypeDto): Promise<any> {
    return this.sampletypeRepository.save(sampletype);
  }

  async getSampletypes() {
    const query = this.sampletypeRepository
      .createQueryBuilder('entity')
      .orderBy('description', 'ASC');

    return query.getMany();
  }

  async getSampletype(id: number) {
    const sampletypeFound = this.sampletypeRepository.findOne({
      where: {
        id,
      },
    });
    if (!sampletypeFound) {
      return new HttpException('lista no encontrado', HttpStatus.NOT_FOUND);
    }
    return sampletypeFound;
  }

  async updateSampletype(id: number, sampletype: UpdateSampletypeDto) {
    const sampletypeFound = await this.sampletypeRepository.findOne({
      where: {
        id,
      },
    });
    if (!sampletypeFound) {
      return new HttpException('No encontrado', HttpStatus.NOT_FOUND);
    }
    const updatesampletype = Object.assign(sampletypeFound, sampletype);
    return this.sampletypeRepository.save(updatesampletype);
  }
}
