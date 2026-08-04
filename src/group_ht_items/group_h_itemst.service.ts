import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Grouphtitems } from './group_ht_items.entity';
import { Repository } from 'typeorm';
import { CreateGroup_ht_itemsDto } from './dto/create-group_ht_items.dto';
import { UpdateGroup_ht_itemsDto } from './dto/update-group_ht_items.dto';

@Injectable()
export class GroupHtItemsService {
    constructor(
        @InjectRepository(Grouphtitems) private group_ht_itemsRepository: Repository<Grouphtitems>
    ) {}
    
    async getGroupItemsHt(id: number) {
        const groupHtFound = this.group_ht_itemsRepository.findOne({
            where: {
                id
            }
        })
        if (!groupHtFound) {
            return new HttpException('grupo HT no encontrado', HttpStatus.NOT_FOUND)
        }
        return groupHtFound
    }
    
    async createGroupItemsHt(groupHt: CreateGroup_ht_itemsDto) {
        const newGroupHt = this.group_ht_itemsRepository.create(groupHt)
        return this.group_ht_itemsRepository.save(newGroupHt)
    }
    
    async updateGroupItemsHt(id: number, groupHt: UpdateGroup_ht_itemsDto) {
        const groupHtFound = await this.group_ht_itemsRepository.findOne({
            where: {
                id
            }
        })
        if (!groupHtFound) {
            return new HttpException('grupo ht no encontrado', HttpStatus.NOT_FOUND)
        }
        const updateGroupHt = Object.assign(groupHtFound, groupHt)
        return this.group_ht_itemsRepository.save(updateGroupHt)
    }
    
    async deleteGroupItems(id: number) {
        const result = await this.group_ht_itemsRepository.delete({ id })
        if (result.affected === 0) {
            return new HttpException('Grupo no encontrado', HttpStatus.NOT_FOUND)
        }

        return result
    }
}