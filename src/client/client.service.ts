import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Client } from './client.entity';
import { Repository } from 'typeorm';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';

@Injectable()
export class ClientService {
  constructor(
    @InjectRepository(Client) private clientRepository: Repository<Client>,
  ) {}

  async getClients(): Promise<Client[]> {
    return this.clientRepository.find({
      where: {
        hide_client: false,
      },
      order: {
        business_name: 'ASC',
      },
    });
  }

  async getClientsAll(): Promise<Client[]> {
    return this.clientRepository
      .createQueryBuilder('client')
      .where('client.id != :id', { id: 1 })
      .orderBy('client.business_name', 'ASC')
      .getMany();
  }

  async createClient(client: CreateClientDto) {
    const newExam = this.clientRepository.create(client);
    return this.clientRepository.save(newExam);
  }

  async getClient(id: number) {
    const clientFound = this.clientRepository.findOne({
      where: {
        id,
      },
    });
    if (!clientFound) {
      return new HttpException('cliente no encontrado', HttpStatus.NOT_FOUND);
    }
    return clientFound;
  }

  async updateClient(id: number, client: UpdateClientDto) {
    const clientFound = await this.clientRepository.findOne({
      where: {
        id,
      },
    });
    if (!clientFound) {
      return new HttpException('exam no encontrado', HttpStatus.NOT_FOUND);
    }
    const updateExam = Object.assign(clientFound, client);
    return this.clientRepository.save(updateExam);
  }
}
