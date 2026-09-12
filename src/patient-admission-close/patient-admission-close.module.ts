import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthorizationModule } from '../authorization/authorization.module';
import { Dollarvalue } from '../dollar_value/dollarvalue.entity';
import { Exam } from '../exams/exams.entity';
import { Examlists } from '../exam_lists/examlists.entity';
import { PatientProfile } from '../patients/patient-profile.entity';
import { Patient } from '../patients/patients.entity';
import { Client } from '../client/client.entity';
import { Tax } from '../tax/tax.entity';
import { ExamTariffPrice } from '../tariffs/exam-tariff-price.entity';
import { Tariff } from '../tariffs/tariff.entity';
import { TypePayment } from '../type_payment/typepayment.entity';
import { Waypay } from '../way_pay/waypay.entity';
import { Waypayitems } from '../way_pay_items/waypayitems.entity';
import { PaymentItemFieldValue } from '../way_pay_items/payment-item-field-value.entity';
import { Currency } from '../type_payment/currency.entity';
import { PatientAdmissionCloseAssembler } from './patient-admission-close.assembler';
import { PatientAdmissionCloseCalculator } from './patient-admission-close-calculator';
import { PatientAdmissionCloseCatalogResolver } from './patient-admission-close-catalog.resolver';
import { PatientAdmissionCloseController } from './patient-admission-close.controller';
import { PatientAdmissionCloseRateResolver } from './patient-admission-close-rate.resolver';
import { PatientAdmissionCloseRepository } from './patient-admission-close.repository';
import { PatientAdmissionCloseService } from './patient-admission-close.service';
import { PatientAdmissionCloseTransaction } from './patient-admission-close.transaction';
import { PatientAdmissionCloseValidator } from './patient-admission-close.validator';
@Module({imports:[AuthorizationModule,TypeOrmModule.forFeature([Dollarvalue,Exam,Examlists,PatientProfile,Patient,Client,Tax,ExamTariffPrice,Tariff,TypePayment,Currency,Waypay,Waypayitems,PaymentItemFieldValue])],controllers:[PatientAdmissionCloseController],providers:[PatientAdmissionCloseValidator,PatientAdmissionCloseTransaction,PatientAdmissionCloseCatalogResolver,PatientAdmissionCloseCalculator,PatientAdmissionCloseAssembler,PatientAdmissionCloseRepository,PatientAdmissionCloseRateResolver,PatientAdmissionCloseService]})
export class PatientAdmissionCloseModule {}
