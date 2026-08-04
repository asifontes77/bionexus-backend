import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Waypayitems } from './waypayitems.entity';
import { Repository } from 'typeorm';
import { CreateWaypayitemsDto } from './dto/create-waypayitems.dto';
import { UpdateWaypayitemsDto } from './dto/update-waypayitems.dto';

@Injectable()
export class WaypayitemsService {
    constructor(
        @InjectRepository(Waypayitems) private waypayitemsRepository: Repository<Waypayitems>
    ) {}

    async createWaypayitems(waypayitems: CreateWaypayitemsDto): Promise<any> {
        return this.waypayitemsRepository.save(waypayitems) 
    }

    async updateWaypayitems(id: number, waypayitems: UpdateWaypayitemsDto) {
        const waypayitemsFound = await this.waypayitemsRepository.findOne({
            where: {
                id
            }
        })
        if (!waypayitemsFound) {
            return new HttpException('forma de pago no encontrado', HttpStatus.NOT_FOUND)
        }
        const updateWaypayitems = Object.assign(waypayitemsFound, waypayitems)
        return this.waypayitemsRepository.save(updateWaypayitems)
    }
}