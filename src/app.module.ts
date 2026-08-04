import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ExamsModule } from './exams/exams.module';
import { ExamGroupModule } from './exam_group/examgroup.module';
import { SpecialTestLabModule } from './special_test_lab/special_test_lab.module';
import { SpecialTestItemsModule } from './special_test_items/special_test_items.module';
import { ExamListsModule } from './exam_lists/examlists.module';
import { InvoiceModule } from './invoice/invoice.module';
import { InvoiceitemsModule } from './invoice_items/invoiceitems.module';
import { LaboratoryModule } from './laboratory/laboratory.module';
import { LicenseModule } from './license/license.module';
import { PatientsModule } from './patients/patients.module';
import { UsersModule } from './users/users.module';
import { DollarvalueModule } from './dollar_value/dollarvalue.module';
import { TaxModule } from './tax/tax.module';
import { SampleTypeModule } from './sample_type/sampletype.module';
import { ClientModule } from './client/client.module';
import { TypePaymentModule } from './type_payment/typepayment.module';
import { WaypayModule } from './way_pay/waypay.module';
import { CustomerAccountsReceivableModule } from './customer_accounts_receivable/customer_accounts_receivable.module';
import { WaypayitemsModule } from './way_pay_items/waypayitems.module';
import { AntibioticModule } from './antibiotic/antibiotic.module';
import { ParasiticformsModule } from './parasiticforms/parasiticforms.module';
import { Cash_registerModule } from './cash_register/cash_register.module';
import { ListGermsModule } from './list_germs/list_germs.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ServeStaticModule } from '@nestjs/serve-static';
import { GroupHtModule } from './group_ht/group_ht.module';
import { RoutinesModule } from './routines/routines.module';
import { GroupHtItemsModule } from './group_ht_items/group_ht_items.module';
import { join } from 'path';
import { NestFactory } from '@nestjs/core';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'mysql',
      host: '127.0.0.1',
      port: 3306,
      username: 'root',
      password: 'Toro2024',
      database: 'databasetoro',
      entities: [__dirname + '/**/*.entity{.ts,.js}'],
      synchronize: true,
    }),
    ExamsModule,
    ExamGroupModule,
    SpecialTestLabModule,
    SpecialTestItemsModule,
    ExamListsModule,
    InvoiceModule,
    InvoiceitemsModule,
    LaboratoryModule,
    LicenseModule,
    PatientsModule,
    UsersModule,
    DollarvalueModule,
    TaxModule,
    SampleTypeModule,
    ClientModule,
    TypePaymentModule,
    WaypayModule,
    WaypayitemsModule,
    CustomerAccountsReceivableModule,
    AntibioticModule,
    ParasiticformsModule,
    Cash_registerModule,
    ListGermsModule,
    GroupHtModule,
    RoutinesModule,
    GroupHtItemsModule,
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'public'),
      exclude: ['/api/(.*)'],
    }),
    ListGermsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {
  static async create() {
    const app = await NestFactory.create(AppModule);
    return app;
  }
}
