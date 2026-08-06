import {
  Body,
  Controller,
  Get,
  Post,
  Param,
  ParseIntPipe,
  Patch,
  UseGuards,
  Delete,
} from '@nestjs/common';
import { SpecialTestItemsService } from './special_test_items.service';
import { JwtUserGuard } from 'src/users/jwt-user.guard';
import { CreateSpecialTestItemsDto } from './dto/create-special_test_itms.dto';
import { updateSpecialTestItemsDto } from './dto/update-special_test_itms.dto';

@Controller('specialtestItems')
export class SpecialtestItemsController {
  constructor(private specialtestItemsService: SpecialTestItemsService) {}

  @Post()
  createSpecialTestItems(@Body() test: CreateSpecialTestItemsDto) {
    return this.specialtestItemsService.createSpecialTestItems(test);
  }

  @UseGuards(JwtUserGuard)
  @Get()
  getSpecialTestItemsList() {
    return this.specialtestItemsService.getSpecialTestItemsList();
  }

  @UseGuards(JwtUserGuard)
  @Get(':id')
  getSpecialTestItems(@Param('id', ParseIntPipe) id: number) {
    return this.specialtestItemsService.getSpecialTestItems(id);
  }

  @UseGuards(JwtUserGuard)
  @Patch(':id')
  updateSpecialTestItems(
    @Param('id', ParseIntPipe) id: number,
    @Body() laboratory: updateSpecialTestItemsDto,
  ) {
    return this.specialtestItemsService.updateSpecialTestItems(id, laboratory);
  }

  @Delete(':id')
  deleteTestItems(@Param('id', ParseIntPipe) id: number) {
    return this.specialtestItemsService.deleteTestItems(id);
  }
}
