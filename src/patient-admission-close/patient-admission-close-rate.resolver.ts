import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Dollarvalue } from '../dollar_value/dollarvalue.entity';
@Injectable()
export class PatientAdmissionCloseRateResolver {
  async resolve(manager:EntityManager,requiresLocal:boolean){
    const record=await manager.getRepository(Dollarvalue).findOne({where:{},order:{id:'DESC'}});
    if(!record){if(requiresLocal)throw new NotFoundException('PATIENT_ADMISSION_CLOSE_EXCHANGE_RATE_NOT_FOUND');return{value:1,date:null};}
    const value=Number(record.value);if(!Number.isFinite(value)||value<=0)throw new BadRequestException('PATIENT_ADMISSION_CLOSE_EXCHANGE_RATE_INVALID');
    if(!(record.date instanceof Date)||Number.isNaN(record.date.getTime()))throw new BadRequestException('PATIENT_ADMISSION_CLOSE_EXCHANGE_RATE_DATE_INVALID');
    return{value,date:record.date};
  }
}
