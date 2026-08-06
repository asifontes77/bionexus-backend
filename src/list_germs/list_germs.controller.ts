import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ListGermsService } from './list_germs.service';
import { JwtUserGuard } from 'src/users/jwt-user.guard';
import { CreateList_germsDto } from './dto/create-list_germs.dto';
import { UpdateList_germsDto } from './dto/update-list_germs.dto';

@Controller('list-germs')
export class ListGermsController {
  constructor(private listGermsService: ListGermsService) {}

  @UseGuards(JwtUserGuard)
  @Get()
  geListGerms() {
    return this.listGermsService.geListGerms();
  }

  @UseGuards(JwtUserGuard)
  @Get('/list')
  getListGermsOrder() {
    return this.listGermsService.getListGermsOrder();
  }

  @UseGuards(JwtUserGuard)
  @Get(':id')
  getGerm(@Param('id', ParseIntPipe) id: number) {
    return this.listGermsService.getGerm(id);
  }

  @UseGuards(JwtUserGuard)
  @Post()
  createGerm(@Body() newGerm: CreateList_germsDto) {
    return this.listGermsService.createGerm(newGerm);
  }

  @UseGuards(JwtUserGuard)
  @Patch(':id')
  updateGerm(
    @Param('id', ParseIntPipe) id: number,
    @Body() germ: UpdateList_germsDto,
  ) {
    return this.listGermsService.updateGerm(id, germ);
  }
}
