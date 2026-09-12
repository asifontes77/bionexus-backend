import { Injectable } from '@nestjs/common';
import { DeepPartial, EntityManager } from 'typeorm';
import { SecurityAuditService } from '../audit/security-audit.service';
import { Exam } from '../exams/exams.entity';
import { PatientProfile } from '../patients/patient-profile.entity';
import { Patient } from '../patients/patients.entity';
import { Waypay } from '../way_pay/waypay.entity';
import { Waypayitems } from '../way_pay_items/waypayitems.entity';
import { PaymentItemFieldValue } from '../way_pay_items/payment-item-field-value.entity';
@Injectable()
export class PatientAdmissionCloseRepository {
  constructor(private readonly audit: SecurityAuditService) {}
  async persist(manager: EntityManager, rows: any) {
    const profileRepository=manager.getRepository(PatientProfile);
    const admissionRepository=manager.getRepository(Patient);
    const examRepository=manager.getRepository(Exam);
    const wayPayRepository=manager.getRepository(Waypay);
    const itemRepository=manager.getRepository(Waypayitems);
    const valueRepository=manager.getRepository(PaymentItemFieldValue);
    const profileEntity=profileRepository.create(rows.profile as DeepPartial<PatientProfile>);
    const profile:PatientProfile=await profileRepository.save(profileEntity);
    rows.admission.patient_profile_id=profile.id;
    const admissionEntity=admissionRepository.create(rows.admission as DeepPartial<Patient>);
    const admission:Patient=await admissionRepository.save(admissionEntity);
    profile.source_admission_id=admission.id;
    await profileRepository.save(profile);
    const examEntities=rows.exams.map((row:any)=>examRepository.create({...row,patientsId:admission.id} as DeepPartial<Exam>));
    const exams:Exam[]=await examRepository.save(examEntities);
    const wayPayEntity=wayPayRepository.create({...rows.wayPay,id_patients:admission.id} as DeepPartial<Waypay>);
    const wayPay:Waypay=await wayPayRepository.save(wayPayEntity);
    const paymentEntities=rows.wayPayItems.map((row:any)=>itemRepository.create({...row,id_way_pay:wayPay.id,fieldValues:undefined} as DeepPartial<Waypayitems>));
    const payments:Waypayitems[]=await itemRepository.save(paymentEntities);
    const valueEntities=payments.flatMap((payment,index)=>(rows.wayPayItems[index].fieldValues??[]).map((value:any)=>valueRepository.create({...value,paymentItemId:payment.id} as DeepPartial<PaymentItemFieldValue>)));
    if(valueEntities.length>0)await valueRepository.save(valueEntities);
    await this.audit.write(manager,{...rows.audit,entityId:admission.id});
    return{profileId:profile.id,admissionId:admission.id,patientPosition:admission.patient_position,examIds:exams.map((row:Exam)=>row.id),wayPayId:wayPay.id,paymentIds:payments.map((row:Waypayitems)=>row.id),totals:{subtotal:Number(admission.subtotal),taxTotal:Number(admission.iva_total),total:Number(admission.total),paid:Number(admission.total_canceled)}};
  }
}
