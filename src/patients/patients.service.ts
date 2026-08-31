import { BadRequestException, ConflictException, HttpException, HttpStatus, Injectable, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Patient } from './patients.entity';
import { DataSource, Repository } from 'typeorm';
import { SecurityAuditService } from '../audit/security-audit.service';
import { UpdatePatientsDto } from './dto/update-patients.dto';
import { CreatePatientsDto } from './dto/create-patients.dto';
import * as nodemailer from 'nodemailer';
import { LaboratoryService } from 'src/laboratory/laboratory.service';
import * as puppeteer from 'puppeteer';
import { ThermalPrinter } from 'node-thermal-printer';

@Injectable()
export class PatientsService {
  constructor(
    @InjectRepository(Patient) private patientRepository: Repository<Patient>,
    private laboratoryService: LaboratoryService,
    @Optional() private readonly dataSource?: DataSource,
    @Optional() private readonly securityAuditService?: SecurityAuditService,
  ) {}
  private readonly resultsEmailInProgress = new Set<number>();

  async createPatient(patients: CreatePatientsDto): Promise<any> {
    return this.patientRepository.save(patients);
  }

  async getPatientLists() {
    return this.patientRepository.find();
  }

  async getPatient(id: number) {
    const patientFound = await this.patientRepository.findOne({
      where: {
        id,
      },
      relations: {
        exams: true,
      },
    });
    if (!patientFound) {
      return new HttpException('paciente no encontrado', HttpStatus.NOT_FOUND);
    }
    return patientFound;
  }

  async getPatientsDate(admission: Date) {
    return this.patientRepository.find({
      where: {
        admission_date: admission,
      },
      relations: {
        exams: true,
      },
    });
  }

  async getPatientsDateOrder(admission: Date) {
    return this.patientRepository
      .createQueryBuilder('patient')
      .leftJoinAndSelect('patient.exams', 'exam') // Selecciona automáticamente todos los campos de 'exam'
      .leftJoinAndSelect('exam.examGroup', 'exam_group') // Selecciona todos los campos de 'examGroup'
      .where('patient.admission_date = :admission', { admission })
      .orderBy('patient.id', 'ASC')
      .addOrderBy('exam_group.position', 'ASC') // Ordenar por exam_group.position
      .addOrderBy('exam.position', 'ASC') // Luego ordenar por exam.position
      .getMany();
  }

  async getPatientOrder(id: number) {
    return this.patientRepository
      .createQueryBuilder('patient')
      .leftJoinAndSelect('patient.exams', 'exam')
      .leftJoinAndSelect('exam.examGroup', 'exam_group')
      .where('patient.id = :id', { id })
      .orderBy('exam_group.position', 'ASC')
      .addOrderBy('exam.position', 'ASC')
      .getOne();
  }

  async getPatientIdValidatedResult(id: number) {
    return this.patientRepository
      .createQueryBuilder('patient')
      .leftJoinAndSelect('patient.exams', 'exam')
      .leftJoinAndSelect('exam.examGroup', 'exam_group')
      .where('patient.id = :id', { id })
      .andWhere('exam.approved_id > 0')
      .orderBy('exam.approved_id', 'ASC')
      .addOrderBy('exam_group.position', 'ASC')
      .addOrderBy('exam.position', 'ASC')
      .getOne();
  }

  async getPatientsWithInvoice(admission: Date) {
    return this.patientRepository
      .createQueryBuilder('patient')
      .where('admission_date= :admission', { admission })
      .andWhere('LENGTH(TRIM(patient.invoice)) != 0')
      .orderBy('patient.id', 'ASC')
      .getMany();
  }

  async getPatientsSpecial(
    firstDate: string,
    lastDate: string,
    examIds: number[],
  ) {
    return this.patientRepository
      .createQueryBuilder('patient')
      .leftJoinAndSelect('patient.exams', 'exam')
      .where('patient.admission_date >= :firstDate', { firstDate })
      .andWhere(
        'patient.admission_date < DATE_ADD(:lastDate, INTERVAL 1 DAY)',
        { lastDate },
      )
      .andWhere('exam.examlistsId IN (:...examIds)', { examIds })
      .getMany();
  }

  async getPatientsWithQueries(
    firstDate: string,
    lastDate: string,
    namePatient: string,
    userSelection: number,
    clientSelection: number,
    clientSelectionStatus: number,
    ciPatient: string,
    invoice: boolean,
  ) {
    let query = this.patientRepository
      .createQueryBuilder('patient')
      .where('patient.admission_date BETWEEN :firstDate AND :lastDate', {
        firstDate,
        lastDate,
      })
      .orderBy('patient.id', 'ASC');
    if (namePatient) {
      query = query.andWhere('patient.name LIKE :namePatient', {
        namePatient: `%${namePatient}%`,
      });
    }
    if (ciPatient) {
      query = query.andWhere('patient.document_number LIKE :ciPatient', {
        ciPatient: `%${ciPatient}%`,
      });
    }
    if (userSelection !== 0) {
      query = query.andWhere('patient.user_id= :userSelection', {
        userSelection,
      });
    }
    if (clientSelection > 1) {
      query = query.andWhere('patient.client_id= :clientSelection', {
        clientSelection,
      });
    }
    if (clientSelectionStatus !== -1) {
      if (clientSelectionStatus !== 0) {
        query = query.andWhere('patient.total_canceled > 0');
      } else {
        query = query.andWhere('patient.total_canceled = 0');
      }
    }
    if (invoice) {
      query = query.andWhere('patient.invoice IS NULL');
    }
    const patients = await query.getMany();
    return patients;
  }

  async getPatientsWithQueriesTotal(
    firstDate: string,
    lastDate: string,
    namePatient: string,
    userSelection: number,
    clientSelection: number,
    clientSelectionStatus: number,
    ciPatient: string,
    invoice: boolean,
  ) {
    let query = this.patientRepository
      .createQueryBuilder('patient')
      .select('COALESCE(SUM(patient.total), 0)', 'total')
      .addSelect('COALESCE(SUM(patient.total_dollars), 0)', 'totalDollares')
      .where('patient.admission_date BETWEEN :firstDate AND :lastDate', {
        firstDate,
        lastDate,
      })
      .orderBy('patient.id', 'ASC');
    if (namePatient) {
      query = query.andWhere('patient.name LIKE :namePatient', {
        namePatient: `%${namePatient}%`,
      });
    }
    if (ciPatient) {
      query = query.andWhere('patient.document_number LIKE :ciPatient', {
        ciPatient: `%${ciPatient}%`,
      });
    }
    if (userSelection !== 0) {
      query = query.andWhere('patient.user_id= :userSelection', {
        userSelection,
      });
    }
    if (clientSelection > 1) {
      query = query.andWhere('patient.client_id= :clientSelection', {
        clientSelection,
      });
    }
    if (clientSelectionStatus !== -1) {
      if (clientSelectionStatus !== 0) {
        query = query.andWhere('patient.total_canceled > 0');
      } else {
        query = query.andWhere('patient.total_canceled = 0');
      }
    }
    if (invoice) {
      query = query.andWhere('patient.invoice IS NULL');
    }
    const patients = await query.getRawOne();
    return patients;
  }

  async getPatientsDateResult(admission: Date) {
    return this.patientRepository
      .createQueryBuilder('patient')
      .leftJoinAndSelect('patient.exams', 'exams')
      .where('admission_date= :admission', { admission })
      .andWhere('exams.processed_id > 0')
      .orderBy('patient.id', 'ASC')
      .addOrderBy('exams.position', 'ASC')
      .getMany();
  }

  async getPatientsIdResult(id: number) {
    return this.patientRepository
      .createQueryBuilder('patient')
      .leftJoinAndSelect('patient.exams', 'exams')
      .where('patient.id= :id', { id })
      .andWhere('exams.processed_id > 0')
      .orderBy('exams.approved_id', 'ASC')
      .addOrderBy('exams.position', 'ASC')
      .getMany();
  }

  async getPatientsDateGroupResult(admission: Date) {
    return this.patientRepository
      .createQueryBuilder('patient')
      .leftJoinAndSelect('patient.exams', 'exams')
      .where('admission_date= :admission', { admission })
      .andWhere('patient.canceled > 0')
      .andWhere('exams.processed_id > 0')
      .orderBy('patient.id', 'ASC')
      .addOrderBy('exams.position', 'ASC')
      .getMany();
  }

  async getPatientResultsEmailCandidates(date: string) {
    if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new BadRequestException('PATIENT_RESULTS_EMAIL_DATE_INVALID');
    }
    return this.patientRepository
      .createQueryBuilder('patient')
      .innerJoin('patient.exams', 'exam')
      .select([
        'patient.id',
        'patient.patient_position',
        'patient.admission_date',
        'patient.admission_time',
        'patient.name',
        'patient.age',
        'patient.month_year',
        'patient.sex',
        'patient.phone',
        'patient.email',
        'patient.email_status',
      ])
      .where('patient.admission_date = :date', { date })
      .andWhere('patient.email_sent = 1')
      .andWhere('exam.approved_id > 0')
      .andWhere("TRIM(COALESCE(patient.email, '')) <> ''")
      .distinct(true)
      .orderBy('patient.id', 'ASC')
      .getMany();
  }

  async sendPatientResultsEmail(id: number, resultHtml: string, actorUserId?: number) {
    if (!Number.isInteger(id) || id <= 0) throw new BadRequestException('PATIENT_RESULTS_EMAIL_ID_INVALID');
    if (typeof resultHtml !== 'string' || resultHtml.trim() === '') throw new BadRequestException('PATIENT_RESULTS_EMAIL_HTML_REQUIRED');
    if (!Number.isInteger(actorUserId) || Number(actorUserId) <= 0) throw new BadRequestException('PATIENT_RESULTS_EMAIL_ACTOR_INVALID');
    if (this.resultsEmailInProgress.has(id)) throw new ConflictException('PATIENT_RESULTS_EMAIL_IN_PROGRESS');
    this.resultsEmailInProgress.add(id);
    try {
      const patient = await this.patientRepository.findOne({ where: { id }, relations: { exams: true } });
      if (!patient) throw new BadRequestException('PATIENT_RESULTS_EMAIL_PATIENT_NOT_FOUND');
      if (!patient.email_sent) throw new BadRequestException('PATIENT_RESULTS_EMAIL_DISABLED');
      if (typeof patient.email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(patient.email.trim())) throw new BadRequestException('PATIENT_RESULTS_EMAIL_ADDRESS_INVALID');
      if (!Array.isArray(patient.exams) || !patient.exams.some((exam) => Number(exam.approved_id) > 0)) throw new BadRequestException('PATIENT_RESULTS_EMAIL_NOT_APPROVED');
      if (patient.email_status) throw new ConflictException('PATIENT_RESULTS_EMAIL_ALREADY_SENT');
      const pdf = await this.generatePdfFromHtmlOut(resultHtml);
      await this.sendResultsEmailBuffer(patient, pdf);
      if (!this.dataSource || !this.securityAuditService) throw new Error('PATIENT_RESULTS_EMAIL_TRANSACTION_UNAVAILABLE');
      return this.dataSource.transaction(async (manager) => {
        const repository = manager.getRepository(Patient);
        patient.result_html = resultHtml;
        patient.deliver_date = new Date();
        patient.delivery_id = actorUserId as number;
        patient.receive = 'por correo';
        patient.email_status = true;
        const saved = await repository.save(patient);
        await this.securityAuditService!.write(manager, { actorUserId: actorUserId as number, action: 'patient.results-email.sent', entityType: 'patient', entityId: id, summary: 'Resultados entregados por correo', metadata: { deliveryMethod: 'email' } });
        return { id: saved.id, emailStatus: true, deliverDate: saved.deliver_date, deliveryId: saved.delivery_id, receive: saved.receive };
      });
    } finally { this.resultsEmailInProgress.delete(id); }
  }

  private async sendResultsEmailBuffer(patient: Patient, pdf: Buffer): Promise<void> {
    const laboratory = await this.laboratoryService.getLaboratory(1);
    const settings = laboratory.sendEmail as unknown as { isGmail?: boolean; host?: string; port?: number; secure?: boolean; user?: string; pass?: string; from?: string };
    if (!settings || !settings.user || !settings.pass || !settings.from) throw new BadRequestException('PATIENT_RESULTS_EMAIL_CONFIGURATION_INVALID');
    const auth = { user: settings.user, pass: settings.pass };
    const transport = settings.isGmail ? { service: 'Gmail', auth } : { host: settings.host, port: settings.port, secure: settings.secure, auth };
    const transporter = nodemailer.createTransport(transport);
    await transporter.sendMail({ from: settings.from, to: patient.email, subject: 'Resultados de examenes de laboratorio', html: `Adjunto se encuentran los resultados de laboratorio.<br><br>Ingreso: ${patient.admission_date}`, attachments: [{ filename: `resultados-${patient.id}.pdf`, content: pdf, contentType: 'application/pdf' }] });
  }

  async getPatientResultsDatesApproved(admission: Date) {
    return this.patientRepository
      .createQueryBuilder('patient')
      .leftJoinAndSelect('patient.exams', 'exams')
      .where('admission_date= :admission', { admission })
      .andWhere('exams.approved_id > 0')
      .andWhere('patient.email_sent = 1')
      .orderBy('patient.id', 'ASC')
      .addOrderBy('exams.position', 'ASC')
      .getMany();
  }

  async getPatientsDateWorksheetResult(admission: Date) {
    return this.patientRepository
      .createQueryBuilder('patient')
      .leftJoinAndSelect('patient.exams', 'exams')
      .where('admission_date= :admission', { admission })
      .orderBy('patient.id', 'ASC')
      .addOrderBy('exams.position', 'ASC')
      .getMany();
  }

  async getPatientsTotalByDate(admission: Date) {
    return this.patientRepository.count({
      where: {
        admission_date: admission,
      },
    });
  }

  async getPatientsCI(ci: string) {
    const patientFound = this.patientRepository.findOne({
      where: {
        document_number: ci,
      },
      order: {
        id: 'DESC',
      },
    });
    if (!patientFound) {
      return new HttpException('paciente no encontrado', HttpStatus.NOT_FOUND);
    }
    return patientFound;
  }

  async updatePatient(id: number, patient: UpdatePatientsDto) {
    const patientFound = await this.patientRepository.findOne({
      where: {
        id,
      },
    });
    if (!patientFound) {
      return new HttpException('paciente no encontrado', HttpStatus.NOT_FOUND);
    }
    const updatePatient = Object.assign(patientFound, patient);
    return this.patientRepository.save(updatePatient);
  }

  async getTotalPatientsMonth(firstDate: Date, lastDate: Date) {
    const result = await this.patientRepository
      .createQueryBuilder('Patient')
      .select('COUNT(id)', 'total')
      .where('admission_date BETWEEN :firstDate AND :lastDate', {
        firstDate,
        lastDate,
      })
      .andWhere('canceled = 0')
      .getRawOne();

    return result && result.total ? parseInt(result.total, 10) : 0;
  }

  async enviarCorreo(
    destinatario: string,
    asunto: string,
    contenido: string,
    adjuntoFile: string,
    adjuntoPath: string,
  ) {
    const laboratoryFound = await this.laboratoryService.getLaboratory(1);
    const row = JSON.parse(JSON.stringify(laboratoryFound));
    let transporterData = null;
    if (row.sendEmail.isGmail) {
      transporterData = {
        service: 'Gmail',
        auth: {
          user: row.sendEmail.user,
          pass: row.sendEmail.pass,
        },
      };
    } else {
      transporterData = {
        host: row.sendEmail.host,
        port: row.sendEmail.port,
        secure: row.sendEmail.secure,
        auth: {
          user: row.sendEmail.user,
          pass: row.sendEmail.pass,
        },
      };
    }
    const transporter = nodemailer.createTransport(transporterData);
    await transporter.sendMail({
      from: row.sendEmail.from,
      to: destinatario,
      subject: asunto,
      html: contenido,
      attachments: [
        {
          filename: adjuntoFile,
          path: adjuntoPath,
        },
      ],
    });
  }

  async generatePdfFromHtml(html: string, outputPath: string): Promise<void> {
    const browser = await puppeteer.launch({
      headless: true,
    });

    try {
      const page = await browser.newPage();
      await page.setContent(html);

      await page.pdf({ path: outputPath, format: 'letter' });
    } finally {
      await browser.close();
    }
  }

  async generatePdfFromHtmlOut(html: string): Promise<Buffer> {
    const browser = await puppeteer.launch({
      headless: true,
    });

    try {
      const page = await browser.newPage();
      await page.setContent(html);

      const pdfBuffer = await page.pdf({ format: 'letter' });

      return Buffer.from(pdfBuffer);
    } finally {
      await browser.close();
    }
  }

  async printReceipt(id: number): Promise<void> {
    const patientFound = await this.getPatient(id);
    const laboratoryFound = await this.laboratoryService.getLaboratory(1);
    const laboratory = JSON.parse(JSON.stringify(laboratoryFound));
    if (patientFound && laboratory.printer_interface.legth !== 0) {
      const row = JSON.parse(JSON.stringify(patientFound));
      const rowE = row.exams;

      const printer = new ThermalPrinter({
        type: laboratory.printer_type,
        interface: laboratory.printer_interface,
      });

      printer.alignCenter();
      printer.println('COMPROBANTE PACIENTE');
      printer.alignLeft();
      printer.println(`FECHA: ${row.admission_date}`);
      printer.println('NOMBRE:');
      printer.println(`(${row.patient_position}) ${row.name}`);
      printer.println(
        `Edad y sexo: ${row.age} ${row.month_year} ${
          row.sex ? 'masculino' : 'femanino'
        }`,
      );
      printer.println(`Teléfono: ${row.phone}`);
      printer.newLine();
      printer.println('OBSERVACION:');
      printer.println(row.observation);
      printer.newLine();
      printer.alignCenter();
      printer.println('EXAMENES SOLICITADOS');
      printer.drawLine();
      rowE.forEach((item) => {
        printer.tableCustom([
          { text: item.description, align: 'LEFT', cols: 30 },
          { text: item.price, align: 'RIGHT', cols: 18 },
        ]);
      });
      printer.drawLine();
      printer.tableCustom([
        { text: 'TOTAL:', align: 'LEFT', cols: 30, bold: true },
        { text: row.total, align: 'RIGHT', cols: 18, bold: true },
      ]);
      if (row.total_dollars !== 0) {
        printer.tableCustom([
          { text: 'TOTAL en $:', align: 'LEFT', cols: 30, bold: true },
          { text: row.total_dollars, align: 'RIGHT', cols: 18, bold: true },
        ]);
      }

      printer.cut();
      try {
        await printer.execute();
        console.log('Recibo impreso correctamente.');
      } catch (error) {
        console.error('Error al imprimir:', error);
      }
    }
  }
}
