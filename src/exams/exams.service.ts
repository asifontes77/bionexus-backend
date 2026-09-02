import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Exam } from './exams.entity';
import { Repository } from 'typeorm';
import { UpdateExamsDto } from './dto/update-exams.dto';
import { CreateExamsDto } from './dto/create-exams.dto';
import { PatientsService } from 'src/patients/patients.service';

@Injectable()
export class ExamsService {
  constructor(
    @InjectRepository(Exam) private examRepository: Repository<Exam>,
    private patientsService: PatientsService,
  ) {}

  async createExam(exams: CreateExamsDto) {
    const patientFound = await this.patientsService.getPatient(
      exams.patientsId,
    );

    if (!patientFound)
      return new HttpException('paciente no registrado', HttpStatus.NOT_FOUND);

    const values = this.normalizeExamCatalogInput(exams, true);
    const newExam = this.examRepository.create(values);
    return this.toLegacyResponse(await this.examRepository.save(newExam));
  }

  async getExam(id: number) {
    const examFound = this.examRepository.findOne({
      where: {
        id,
      },
    });
    if (!examFound) {
      return new HttpException('examen no encontrado', HttpStatus.NOT_FOUND);
    }
    return examFound;
  }

  async updateExam(id: number, exam: UpdateExamsDto) {
    const examFound = await this.examRepository.findOne({
      where: {
        id,
      },
    });
    if (!examFound) {
      return new HttpException('exam no encontrado', HttpStatus.NOT_FOUND);
    }
    const values = this.normalizeExamCatalogInput(exam, false);
    const updateExam = Object.assign(examFound, values);
    return this.toLegacyResponse(await this.examRepository.save(updateExam));
  }

  async getPatientsWithClient(clientIds: number[]): Promise<any> {
    return this.examRepository
      .createQueryBuilder('exam')
      .select('exam.description', 'description')
      .addSelect('exam.exam_catalog_id', 'exam_id')
      .addSelect('exam.tax_amount', 'tax_amount')
      .addSelect('SUM(exam.amount)', 'amount')
      .addSelect('SUM(exam.tax_total)', 'tax_total')
      .addSelect('SUM(exam.total)', 'total')
      .where('exam.patientsId IN (:...clientIds)', { clientIds: clientIds })
      .groupBy('exam.description')
      .addGroupBy('exam.tax_amount')
      .addGroupBy('exam.exam_catalog_id')
      .getRawMany();
  }

  async getTotalExamWithGroup(
    examIds: number[],
    firstDate: Date,
    lastDate: Date,
  ) {
    const totales = await this.examRepository
      .createQueryBuilder('exam')
      .select([
        'COALESCE(COUNT(id), 0) AS total',
        'COALESCE(COUNT(CASE WHEN exam.result IS NOT NULL THEN 1 END), 0) AS total_recorded',
      ])
      .where('DATE(exam.date) BETWEEN :firstDate AND :lastDate', {
        firstDate,
        lastDate,
      })
      .andWhere('exam.exam_catalog_id IN (:...examIds)', { examIds: examIds })
      .getRawOne();
    return totales;
  }

  private normalizeExamCatalogInput<T extends { examlistsId?: number; exam_catalog_id?: number }>(value: T, required: boolean): Omit<T, 'examlistsId'> & { exam_catalog_id?: number } {
    const legacy = value.examlistsId;
    const canonical = value.exam_catalog_id;
    if (legacy !== undefined && canonical !== undefined && Number(legacy) !== Number(canonical)) throw new HttpException('EXAM_CATALOG_ID_CONFLICT', HttpStatus.BAD_REQUEST);
    const selected = canonical ?? legacy;
    if (required && selected === undefined) throw new HttpException('EXAM_CATALOG_ID_REQUIRED', HttpStatus.BAD_REQUEST);
    if (selected !== undefined && (!Number.isInteger(Number(selected)) || Number(selected) <= 0)) throw new HttpException('EXAM_CATALOG_ID_INVALID', HttpStatus.BAD_REQUEST);
    const { examlistsId: _legacy, ...rest } = value;
    return selected === undefined ? rest : { ...rest, exam_catalog_id: Number(selected) };
  }

  private toLegacyResponse(exam: Exam): Exam {
    exam.examlistsId = exam.exam_catalog_id;
    return exam;
  }

  async getPatientsWithClientTax(
    clientIds: number[],
    tax: number,
  ): Promise<any> {
    console.log('clientIds tax: ', clientIds);
    return this.examRepository
      .createQueryBuilder('exam')
      .select('SUM(exam.tax_total)', 'tax_total')
      .addSelect('SUM(exam.total)', 'total')
      .where('exam.patientsId IN (:...clientIds)', { clientIds: clientIds })
      .andWhere('exam.tax_amount= :tax', { tax: tax })
      .groupBy('exam.description')
      .getRawMany();
  }
}
