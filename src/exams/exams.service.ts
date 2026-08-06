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

    const newExam = this.examRepository.create(exams);
    return this.examRepository.save(newExam);
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
    const updateExam = Object.assign(examFound, exam);
    return this.examRepository.save(updateExam);
  }

  async getPatientsWithClient(clientIds: number[]): Promise<any> {
    return this.examRepository
      .createQueryBuilder('exam')
      .select('exam.description', 'description')
      .addSelect('exam.examlistsId', 'exam_id')
      .addSelect('exam.tax_amount', 'tax_amount')
      .addSelect('SUM(exam.amount)', 'amount')
      .addSelect('SUM(exam.tax_total)', 'tax_total')
      .addSelect('SUM(exam.total)', 'total')
      .where('exam.patientsId IN (:...clientIds)', { clientIds: clientIds })
      .groupBy('exam.description')
      .addGroupBy('exam.tax_amount')
      .addGroupBy('exam.examlistsId')
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
      .andWhere('exam.examlistsId IN (:...examIds)', { examIds: examIds })
      .getRawOne();
    return totales;
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
