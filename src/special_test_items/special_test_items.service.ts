import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { special_test_items } from './special_test_items.entity';
import { Repository } from 'typeorm';
import { CreateSpecialTestItemsDto } from './dto/create-special_test_itms.dto';
import { updateSpecialTestItemsDto } from './dto/update-special_test_itms.dto';

@Injectable()
export class SpecialTestItemsService {
  constructor(
    @InjectRepository(special_test_items)
    private specialTestItemsRepository: Repository<special_test_items>,
  ) {}
  
  async createSpecialTestItems(test: CreateSpecialTestItemsDto): Promise<any> {
    return this.specialTestItemsRepository.save(test);
  }
  
  async getSpecialTestItemsList() {
    return this.specialTestItemsRepository.find();
  }

  async getSpecialTestItems(id: number) {
    const itemsFound = await this.specialTestItemsRepository.findOne({
      where: {
        id,
      },
    });
    if (!itemsFound) {
      return new HttpException('Item de laboratorio no encontrado', HttpStatus.NOT_FOUND);
    }
    return itemsFound;
  }

  async updateSpecialTestItems(id: number, laboratory: updateSpecialTestItemsDto) {
    const itemsFound = await this.specialTestItemsRepository.findOne({
      where: {
        id,
      },
    });
    if (!itemsFound) {
      return new HttpException('Item de laboratorio no encontrado', HttpStatus.NOT_FOUND);
    }
    const updateLaboratorio = Object.assign(itemsFound, laboratory);
    return this.specialTestItemsRepository.save(updateLaboratorio);
  }  

  async deleteTestItems(id: number) {
    const result = await this.specialTestItemsRepository.delete({ id })
    if (result.affected === 0) {
        return new HttpException('Grupo no encontrado', HttpStatus.NOT_FOUND)
    }

    return result
}
}