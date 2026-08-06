import {
  Body,
  Controller,
  Get,
  Post,
  Param,
  ParseIntPipe,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { WaypayService } from './waypay.service';
import { CreateWaypayDto } from './dto/create-waypay.dto';
import { UpdateWaypayDto } from './dto/update-waypay.dto';
import { JwtUserGuard } from '../users/jwt-user.guard';
import { Waypay } from './waypay.entity';

@Controller('waypay')
export class WaypayController {
  constructor(private waypayService: WaypayService) {}

  @UseGuards(JwtUserGuard)
  @Get('/date/:admissiondate')
  getWaypayDate(
    @Param('admissiondate') admissionDate: Date,
  ): Promise<Waypay[]> {
    return this.waypayService.getWaypayDate(admissionDate);
  }

  @UseGuards(JwtUserGuard)
  @Get('/patient/:id')
  getWaypayPatientId(@Param('id', ParseIntPipe) id: number) {
    return this.waypayService.getWaypayPatientId(id);
  }

  @Post()
  createWaypay(@Body() newWaypay: CreateWaypayDto) {
    return this.waypayService.createWaypay(newWaypay);
  }

  @UseGuards(JwtUserGuard)
  @Patch(':id')
  updateWaypay(
    @Param('id', ParseIntPipe) id: number,
    @Body() waypay: UpdateWaypayDto,
  ) {
    return this.waypayService.updateWaypay(id, waypay);
  }

  @UseGuards(JwtUserGuard)
  @Post('/totales')
  getInvoiceTotales(
    @Body() body: { date: Date; idUser: number; idTypePay: number },
  ) {
    return this.waypayService.getInvoiceTotales(
      body.date,
      body.idUser,
      body.idTypePay,
    );
  }
}
