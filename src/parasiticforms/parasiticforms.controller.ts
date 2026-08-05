import { Body, Controller, Get, Post, Param, ParseIntPipe, Patch, UseGuards } from '@nestjs/common';
import { ParasiticformsService } from './parasiticforms.service';
import { CreateParasiticformsDto } from './dto/create-parasiticforms.dto';
import { UpdateparasiticformsDto } from './dto/update-parasiticforms.dto';
import { JwtUserGuard } from '../users/jwt-user.guard';

@Controller('parasiticforms')
export class ParasiticformsController {
    constructor(private parasiticformsService: ParasiticformsService) {}

    @UseGuards(JwtUserGuard)
    @Get()
    getParasiticformsLists() {
        return this.parasiticformsService.getParasiticformsLists()
    }

    @UseGuards(JwtUserGuard)
    @Get('/order')
    getParasiticformsListsOrder() {
        return this.parasiticformsService.getParasiticformsListsOrder()
    }
    
    @UseGuards(JwtUserGuard)
    @Get(':id')
    getParasiticforms(@Param('id', ParseIntPipe) id: number) {
        return this.parasiticformsService.getParasiticforms(id)
    }
    
    @Post()
    createParasiticforms(@Body() newAntibiotic: CreateParasiticformsDto) {
        return this.parasiticformsService.createParasiticforms(newAntibiotic)
    }
    
    @UseGuards(JwtUserGuard)
    @Patch(':id')
    updateParasiticforms(@Param('id', ParseIntPipe) id: number, @Body() parasitic: UpdateparasiticformsDto) {
        return this.parasiticformsService.updateParasiticforms(id, parasitic)
    }
}