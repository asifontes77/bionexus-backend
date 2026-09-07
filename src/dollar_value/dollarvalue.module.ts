import { Module } from '@nestjs/common';



import { TypeOrmModule } from '@nestjs/typeorm';



import { SecurityAuditModule } from '../audit/security-audit.module';



import { AuthorizationModule } from '../authorization/authorization.module';



import { DollarvalueController } from './dollarvalue.controller';


import { DollarvalueAutomation } from './dollarvalue-automation.entity';


import { DollarvalueAutomationRun } from './dollarvalue-automation-run.entity';


import { DollarvalueAutomationService } from './dollarvalue-automation.service';


import { DollarvalueSourceService } from './dollarvalue-source.service';



import { Dollarvalue } from './dollarvalue.entity';



import { DollarvalueService } from './dollarvalue.service';







@Module({



  imports: [



    TypeOrmModule.forFeature([Dollarvalue, DollarvalueAutomation, DollarvalueAutomationRun]),



    AuthorizationModule,



    SecurityAuditModule,



  ],



  controllers: [DollarvalueController],



  providers: [DollarvalueService, DollarvalueSourceService, DollarvalueAutomationService],



})



export class DollarvalueModule {}
