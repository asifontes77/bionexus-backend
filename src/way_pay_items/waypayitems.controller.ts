import {
  Body,
  Controller,
  Post,
  Param,
  ParseIntPipe,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { WaypayitemsService } from './waypayitems.service';
import { CreateWaypayitemsDto } from './dto/create-waypayitems.dto';
import { UpdateWaypayitemsDto } from './dto/update-waypayitems.dto';
import { JwtUserGuard } from '../users/jwt-user.guard';

@Controller('waypayitems')
export class WaypayitemsController {
  constructor(private waypayitemsService: WaypayitemsService) {}

  @Post()
  createWaypay(@Body() newWaypayitems: CreateWaypayitemsDto) {
    return this.waypayitemsService.createWaypayitems(newWaypayitems);
  }

  @UseGuards(JwtUserGuard)
  @Patch(':id')
  updateWaypay(
    @Param('id', ParseIntPipe) id: number,
    @Body() waypayitems: UpdateWaypayitemsDto,
  ) {
    return this.waypayitemsService.updateWaypayitems(id, waypayitems);
  }
}
