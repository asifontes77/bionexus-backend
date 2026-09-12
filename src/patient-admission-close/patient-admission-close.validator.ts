import { BadRequestException, Injectable } from '@nestjs/common';
import { ClosePatientAdmissionDto } from './dto/close-patient-admission.dto';
export interface NormalizedAdmissionClose {
  clientId: number;
  tariffId: number;
  patient: ClosePatientAdmissionDto['patient'];
  exams: Array<{ examCatalogId: number; quantity: number }>;
  payments: Array<{ typePaymentId: number; amount: number; currency: 'BASE' | 'LOCAL'; description1: string; description2: string }>;
}
@Injectable()
export class PatientAdmissionCloseValidator {
  normalize(body: ClosePatientAdmissionDto): NormalizedAdmissionClose {
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw new BadRequestException('PATIENT_ADMISSION_CLOSE_BODY_REQUIRED');
    const clientId=this.id(body.clientId,'PATIENT_ADMISSION_CLOSE_CLIENT_INVALID');
    const tariffId=this.id(body.tariffId,'PATIENT_ADMISSION_CLOSE_TARIFF_INVALID');
    if (!body.patient || typeof body.patient !== 'object' || Array.isArray(body.patient)) throw new BadRequestException('PATIENT_ADMISSION_CLOSE_PATIENT_REQUIRED');
    const name=this.text(body.patient.name,100,'PATIENT_ADMISSION_CLOSE_NAME_REQUIRED');
    const age=Number(body.patient.age);
    if (!Number.isInteger(age) || age<0 || age>150) throw new BadRequestException('PATIENT_ADMISSION_CLOSE_AGE_INVALID');
    if (typeof body.patient.sex !== 'boolean') throw new BadRequestException('PATIENT_ADMISSION_CLOSE_SEX_INVALID');
    if (!Array.isArray(body.exams) || body.exams.length===0 || body.exams.length>500) throw new BadRequestException('PATIENT_ADMISSION_CLOSE_EXAMS_REQUIRED');
    const exams=body.exams.map(item=>({examCatalogId:this.id(item?.examCatalogId,'PATIENT_ADMISSION_CLOSE_EXAM_INVALID'),quantity:this.quantity(item?.quantity)}));
    if(new Set(exams.map(item=>item.examCatalogId)).size!==exams.length)throw new BadRequestException('PATIENT_ADMISSION_CLOSE_EXAM_DUPLICATED');
    if(!Array.isArray(body.payments)||body.payments.length===0||body.payments.length>50)throw new BadRequestException('PATIENT_ADMISSION_CLOSE_PAYMENTS_REQUIRED');
    const payments=body.payments.map(item=>{
      const currency=item?.currency;
      if(currency!=='BASE'&&currency!=='LOCAL')throw new BadRequestException('PATIENT_ADMISSION_CLOSE_PAYMENT_CURRENCY_INVALID');
      const amount=Number(item?.amount);
      if(!Number.isFinite(amount)||amount<=0||amount>9999999999999999.99)throw new BadRequestException('PATIENT_ADMISSION_CLOSE_PAYMENT_AMOUNT_INVALID');
      return{typePaymentId:this.id(item?.typePaymentId,'PATIENT_ADMISSION_CLOSE_PAYMENT_TYPE_INVALID'),amount:Math.round(amount*100)/100,currency,description1:this.optional(item?.description1,50),description2:this.optional(item?.description2,50)};
    });
    return{clientId,tariffId,patient:{...body.patient,name},exams,payments};
  }
  private id(value:unknown,code:string){const id=Number(value);if(!Number.isInteger(id)||id<=0)throw new BadRequestException(code);return id;}
  private quantity(value:unknown){if(value===undefined)return 1;const quantity=Number(value);if(!Number.isInteger(quantity)||quantity<=0||quantity>100)throw new BadRequestException('PATIENT_ADMISSION_CLOSE_EXAM_QUANTITY_INVALID');return quantity;}
  private text(value:unknown,max:number,code:string){if(typeof value!=='string'||value.trim()===''||value.trim().length>max)throw new BadRequestException(code);return value.trim();}
  private optional(value:unknown,max:number){if(value===undefined||value===null)return'';if(typeof value!=='string'||value.trim().length>max)throw new BadRequestException('PATIENT_ADMISSION_CLOSE_TEXT_INVALID');return value.trim();}
}
