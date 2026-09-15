import { BadRequestException, Injectable } from '@nestjs/common';
export interface AdmissionCalculatedExam { examCatalogId:number; quantity:number; unitPrice:number; subtotal:number; taxRate:number; taxTotal:number; total:number; }
export interface AdmissionCalculatedPayment { typePaymentId:number; currency:'BASE'|'LOCAL'; currencyId:number; enteredAmount:number; baseAmount:number; localAmount:number; fieldValues:Array<{fieldId:number;fieldCode:string;fieldLabel:string;fieldType:string;valueText:string|null;bankId:number|null}>; }
@Injectable()
export class PatientAdmissionCloseCalculator {
  calculateExams(exams:Array<{examCatalogId:number;quantity:number;unitPrice:number;taxRate:number}>){
    return exams.map(item=>{const quantity=this.positive(item.quantity,'PATIENT_ADMISSION_CLOSE_EXAM_QUANTITY_INVALID');const unitPrice=this.nonNegative(item.unitPrice,'PATIENT_ADMISSION_CLOSE_PRICE_INVALID');const taxRate=this.rate(item.taxRate);const subtotal=this.money(quantity*unitPrice);const taxTotal=this.money(subtotal*taxRate/100);return{examCatalogId:item.examCatalogId,quantity,unitPrice:this.money(unitPrice),subtotal,taxRate,taxTotal,total:this.money(subtotal+taxTotal)};});
  }
  calculatePayments(payments:Array<{typePaymentId:number;currency:'BASE'|'LOCAL';currencyId:number;amount:number;fieldValues:Array<{fieldId:number;fieldCode:string;fieldLabel:string;fieldType:string;valueText:string|null;bankId:number|null}>}>,exchangeRate:number){
    const rate=this.positive(exchangeRate,'PATIENT_ADMISSION_CLOSE_EXCHANGE_RATE_INVALID');return payments.map(item=>{const amount=this.positive(item.amount,'PATIENT_ADMISSION_CLOSE_PAYMENT_AMOUNT_INVALID');const baseAmount=item.currency==='BASE'?this.money(amount):this.money(amount/rate);const localAmount=item.currency==='LOCAL'?this.money(amount):this.money(amount*rate);return{typePaymentId:item.typePaymentId,currency:item.currency,currencyId:item.currencyId,enteredAmount:this.money(amount),baseAmount,localAmount,fieldValues:item.fieldValues};});
  }
  summarize(exams:AdmissionCalculatedExam[],payments:AdmissionCalculatedPayment[]){const subtotal=this.money(exams.reduce((s,x)=>s+x.subtotal,0));const taxTotal=this.money(exams.reduce((s,x)=>s+x.taxTotal,0));const total=this.money(exams.reduce((s,x)=>s+x.total,0));const paid=this.money(payments.reduce((s,x)=>s+x.baseAmount,0));const balance=this.money(total-paid);if(Math.abs(balance)>0.01)throw new BadRequestException('PATIENT_ADMISSION_CLOSE_BALANCE_PENDING');return{subtotal,taxTotal,total,paid,balance:0};}
  private money(value:number){if(!Number.isFinite(value))throw new BadRequestException('PATIENT_ADMISSION_CLOSE_AMOUNT_INVALID');return Math.round((value+Number.EPSILON)*100)/100;}
  private positive(value:number,code:string){const number=Number(value);if(!Number.isFinite(number)||number<=0)throw new BadRequestException(code);return number;}
  private nonNegative(value:number,code:string){const number=Number(value);if(!Number.isFinite(number)||number<0)throw new BadRequestException(code);return number;}
  private rate(value:number){const number=Number(value);if(!Number.isFinite(number)||number<0||number>100)throw new BadRequestException('PATIENT_ADMISSION_CLOSE_TAX_RATE_INVALID');return number;}
}
