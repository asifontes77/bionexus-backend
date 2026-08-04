import {
  Body,
  Controller,
  Get,
  Post,
  Param,
  ParseIntPipe,
  Delete,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { Client } from './client.entity';
import { ClientService } from './client.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { JwtUserGuard } from '../users/jwt-user.guard';

@Controller('client')
export class ClientController {
  constructor(private clientService: ClientService) {}

  @UseGuards(JwtUserGuard)
  @Get()
  getClients() {
    return this.clientService.getClients();
  }
  @UseGuards(JwtUserGuard)
  @Get('/all')
  getClientsAll() {
    return this.clientService.getClientsAll();
  }

  @UseGuards(JwtUserGuard)
  @Get(':id')
  getClient(@Param('id', ParseIntPipe) id: number) {
    return this.clientService.getClient(id);
  }

  @Post()
  createClient(@Body() newClient: CreateClientDto) {
    return this.clientService.createClient(newClient);
  }

  @UseGuards(JwtUserGuard)
  @Patch(':id')
  updateClient(
    @Param('id', ParseIntPipe) id: number,
    @Body() client: UpdateClientDto,
  ) {
    return this.clientService.updateClient(id, client);
  }
}
