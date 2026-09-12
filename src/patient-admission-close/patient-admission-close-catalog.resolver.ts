import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { EntityManager, In } from 'typeorm';
import { Client } from '../client/client.entity';
import { Examlists } from '../exam_lists/examlists.entity';
import { Tax } from '../tax/tax.entity';
import { ExamTariffPrice } from '../tariffs/exam-tariff-price.entity';
import { Tariff } from '../tariffs/tariff.entity';
import { PaymentMethodCurrency } from '../type_payment/payment-method-currency.entity';
import { PaymentMethodField } from '../type_payment/payment-method-field.entity';
import { TypePayment } from '../type_payment/typepayment.entity';
import { NormalizedAdmissionClose } from './patient-admission-close.validator';

export interface ResolvedAdmissionExam { examCatalogId:number; description:string; groupId:number; position:number; quantity:number; unitPrice:number; taxRate:number; taxDescription:string; }
export interface ResolvedAdmissionPayment { typePaymentId:number; currency:'BASE'|'LOCAL'; currencyId:number; amount:number; description1:string; description2:string; }

@Injectable()
export class PatientAdmissionCloseCatalogResolver {
  async resolve(manager:EntityManager,input:NormalizedAdmissionClose){
    const client=await manager.getRepository(Client).findOne({where:{id:input.clientId}});
    if(!client)throw new NotFoundException('PATIENT_ADMISSION_CLOSE_CLIENT_NOT_FOUND');
    const tariff=await manager.getRepository(Tariff).findOne({where:{id:input.tariffId,isActive:true}});
    if(!tariff)throw new NotFoundException('PATIENT_ADMISSION_CLOSE_TARIFF_NOT_FOUND');
    if(input.clientId!==1&&Number(client.tariff_id)!==input.tariffId)throw new BadRequestException('PATIENT_ADMISSION_CLOSE_CLIENT_TARIFF_MISMATCH');
    const examIds=input.exams.map(item=>item.examCatalogId);
    const exams=await manager.getRepository(Examlists).find({where:{id:In(examIds)}});
    if(exams.length!==examIds.length)throw new NotFoundException('PATIENT_ADMISSION_CLOSE_EXAM_NOT_FOUND');
    const prices=await manager.getRepository(ExamTariffPrice).find({where:{tariffId:input.tariffId,examCatalogId:In(examIds),isActive:true}});
    if(prices.length!==examIds.length)throw new NotFoundException('PATIENT_ADMISSION_CLOSE_PRICE_NOT_FOUND');
    const taxIds=[...new Set(exams.map(exam=>Number(exam.tax_id)).filter(id=>Number.isInteger(id)&&id>0))];
    const taxes=taxIds.length?await manager.getRepository(Tax).find({where:{id:In(taxIds)}}):[];
    const taxById=new Map(taxes.map(tax=>[tax.id,tax]));const examById=new Map(exams.map(exam=>[exam.id,exam]));const priceByExam=new Map(prices.map(price=>[price.examCatalogId,price]));
    const resolvedExams:ResolvedAdmissionExam[]=input.exams.map(item=>{const exam=examById.get(item.examCatalogId)!;const price=priceByExam.get(item.examCatalogId)!;const tax=taxById.get(Number(exam.tax_id));return{examCatalogId:exam.id,description:String(exam.description||'').trim(),groupId:Number(exam.group_id)||0,position:Number(exam.position)||0,quantity:item.quantity,unitPrice:Number(price.price),taxRate:Number(tax?.value)||0,taxDescription:String(tax?.description||'Exonerado')};});
    const paymentIds=[...new Set(input.payments.map(item=>item.typePaymentId))];
    const types=await manager.getRepository(TypePayment).find({where:{id:In(paymentIds)},relations:{currencies:{currency:true},fields:true}});
    if(types.length!==paymentIds.length)throw new NotFoundException('PATIENT_ADMISSION_CLOSE_PAYMENT_TYPE_NOT_FOUND');
    const typeById=new Map(types.map(type=>[type.id,type]));
    const resolvedPayments:ResolvedAdmissionPayment[]=input.payments.map(item=>{const type=typeById.get(item.typePaymentId)!;if(Boolean(type.annulled))throw new BadRequestException('PATIENT_ADMISSION_CLOSE_PAYMENT_TYPE_INACTIVE');const currencyCode=item.currency==='BASE'?'USD':'VES';const assignment=(type.currencies||[]).find(row=>Boolean(row.isActive)&&Boolean(row.currency?.isActive)&&row.currency?.code===currencyCode);if(!assignment)throw new BadRequestException('PATIENT_ADMISSION_CLOSE_PAYMENT_CURRENCY_NOT_ALLOWED');const required=(type.fields||[]).filter(field=>Boolean(field.isActive)&&Boolean(field.isRequired)).sort((a,b)=>a.displayOrder-b.displayOrder);if(required[0]&&item.description1==='')throw new BadRequestException('PATIENT_ADMISSION_CLOSE_PAYMENT_REFERENCE_1_REQUIRED');if(required[1]&&item.description2==='')throw new BadRequestException('PATIENT_ADMISSION_CLOSE_PAYMENT_REFERENCE_2_REQUIRED');return{...item,currencyId:assignment.currencyId};});
    return{client,tariff,exams:resolvedExams,payments:resolvedPayments};
  }
}
