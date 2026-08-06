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
import { CustomerAccountsReceivableService } from './customer_accounts_receivable.service';
import { CreateCustomerAccountsReceivableDto } from './dto/create-customer_accounts_receivable.dto';
import { UpdateCustomerAccountsReceivableDto } from './dto/update-customer_accounts_receivable.dto';
import { JwtUserGuard } from '../users/jwt-user.guard';

@Controller('accountsreceivable')
export class Customer_accounts_receivableController {
  constructor(
    private customerAccountsReceivableService: CustomerAccountsReceivableService,
  ) {}

  @UseGuards(JwtUserGuard)
  @Get(':id')
  getAccountsReceivable(@Param('id', ParseIntPipe) id: number) {
    return this.customerAccountsReceivableService.getAccountsReceivable(id);
  }

  @Post()
  createAccountsReceivable(
    @Body() newAccount: CreateCustomerAccountsReceivableDto,
  ) {
    return this.customerAccountsReceivableService.createAccountsReceivable(
      newAccount,
    );
  }

  @UseGuards(JwtUserGuard)
  @Patch(':id')
  updateAccountsReceivable(
    @Param('id', ParseIntPipe) id: number,
    @Body() newAccount: UpdateCustomerAccountsReceivableDto,
  ) {
    return this.customerAccountsReceivableService.updateAccountsReceivable(
      id,
      newAccount,
    );
  }

  @UseGuards(JwtUserGuard)
  @Get('/client/:id')
  getAccountsReceivableWithClient(@Param('id', ParseIntPipe) id: number) {
    return this.customerAccountsReceivableService.getAccountsReceivableWithClient(
      id,
    );
  }

  @UseGuards(JwtUserGuard)
  @Post('/client')
  getAccountsReceivableWithClientDate(
    @Body() body: { id: number; fecha: Date },
  ) {
    return this.customerAccountsReceivableService.getAccountsReceivableWithClientDate(
      body.id,
      body.fecha,
    );
  }

  @UseGuards(JwtUserGuard)
  @Post('/client-date')
  getAccountsReceivableWithClientBetweenDate(
    @Body() body: { clientId: number; firstDate: Date; lastDate: Date },
  ) {
    console.log('body: ', body);
    return this.customerAccountsReceivableService.getAccountsReceivableWithClientBetweenDate(
      body.clientId,
      body.firstDate,
      body.lastDate,
    );
  }
}
