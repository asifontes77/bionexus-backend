import { BadRequestException, Injectable } from '@nestjs/common';
import { ClosePatientAdmissionDto } from './dto/close-patient-admission.dto';
import { PatientAdmissionCloseAssembler } from './patient-admission-close.assembler';
import { PatientAdmissionCloseCalculator } from './patient-admission-close-calculator';
import { PatientAdmissionCloseCatalogResolver } from './patient-admission-close-catalog.resolver';
import { PatientAdmissionCloseRepository } from './patient-admission-close.repository';
import { PatientAdmissionCloseRateResolver } from './patient-admission-close-rate.resolver';
import { PatientAdmissionCloseTransaction } from './patient-admission-close.transaction';
import { PatientAdmissionCloseValidator } from './patient-admission-close.validator';
@Injectable()
export class PatientAdmissionCloseService {
  constructor(private readonly validator:PatientAdmissionCloseValidator,private readonly transaction:PatientAdmissionCloseTransaction,private readonly catalogs:PatientAdmissionCloseCatalogResolver,private readonly calculator:PatientAdmissionCloseCalculator,private readonly assembler:PatientAdmissionCloseAssembler,private readonly repository:PatientAdmissionCloseRepository,private readonly rateResolver:PatientAdmissionCloseRateResolver) {}
  close(body:ClosePatientAdmissionDto,actorUserId:number){
    if(!Number.isInteger(actorUserId)||actorUserId<=0)throw new BadRequestException('PATIENT_ADMISSION_CLOSE_ACTOR_INVALID');
    const normalized=this.validator.normalize(body);
    return this.transaction.execute(async manager=>{
      const resolved=await this.catalogs.resolve(manager,normalized);
      const rate=await this.rateResolver.resolve(manager,normalized.payments.some(item=>item.currency==='LOCAL'));
      const exchangeRate=rate.value;
      const calculatedExams=this.calculator.calculateExams(resolved.exams.map(item=>({examCatalogId:item.examCatalogId,quantity:item.quantity,unitPrice:item.unitPrice,taxRate:item.taxRate})));
      const calculatedPayments=this.calculator.calculatePayments(resolved.payments,exchangeRate);
      const totals=this.calculator.summarize(calculatedExams,calculatedPayments);
      const rows=this.assembler.build(normalized,resolved,calculatedExams,calculatedPayments,totals,actorUserId);
      return this.repository.persist(manager,rows);
    });
  }
}
