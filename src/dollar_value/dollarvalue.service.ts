import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Dollarvalue } from './dollarvalue.entity';
import { Repository } from 'typeorm';
import { UpdateDollarvalueDto } from './dto/update-dollarvalue.dto';
import { CreateDollarvalueDto } from './dto/create-dollarvalue.dto';

@Injectable()
export class DollarvalueService {
  constructor(
    @InjectRepository(Dollarvalue)
    private dollarvalueRepository: Repository<Dollarvalue>,
  ) {}

  async createDollarvalue(dollarvalue: CreateDollarvalueDto): Promise<any> {
    return this.dollarvalueRepository.save(dollarvalue);
  }

  async getDollarvalue() {
    const query = this.dollarvalueRepository
      .createQueryBuilder('entity')
      .orderBy('entity.id', 'DESC')
      .limit(1);

    return query.getMany();
  }

  async updateDollarvalue(id: number, dollarvalue: UpdateDollarvalueDto) {
    const dollarvalueFound = await this.dollarvalueRepository.findOne({
      where: {
        id,
      },
    });
    if (!dollarvalueFound) {
      return new HttpException(
        'Dollar cambio no encontrado',
        HttpStatus.NOT_FOUND,
      );
    }
    const updateDollarvalue = Object.assign(dollarvalueFound, dollarvalue);
    return this.dollarvalueRepository.save(updateDollarvalue);
  }
}
