import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Patient } from './patients.entity';
import { Repository } from 'typeorm';
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
  ) {}

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
      relations: ['exams'],
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
      relations: ['exams'],
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
    console.log('row.sendEmail: ', row.sendEmail);
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
