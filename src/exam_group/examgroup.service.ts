import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Examgroup } from './examgroup.entity';
import { Repository } from 'typeorm';
import { UpdateExamgroupDto } from './dto/update-examgroup.dto';
import { CreateExamgroupDto } from './dto/create-examgroup.dto';

@Injectable()
export class ExamGroupService {
  constructor(
    @InjectRepository(Examgroup)
    private examgroupRepository: Repository<Examgroup>,
  ) {}

  async createExamgroup(examsgroup: CreateExamgroupDto) {
    const maxPosition = await this.examgroupRepository
    .createQueryBuilder('exam_group')
    .select('MAX(position)', 'max')
    .getRawOne();

    const nextPosition = (maxPosition.max || 0) + 1;
    const newExamgroup = this.examgroupRepository.create({
      ...examsgroup,
      position: nextPosition,
    });

    return this.examgroupRepository.save(newExamgroup);
  }

  async getExamgroup(id: number) {
    const examFound = this.examgroupRepository.findOne({
      where: {
        id,
      },
    });
    if (!examFound) {
      return new HttpException(
        'Grupo de examen no encontrado',
        HttpStatus.NOT_FOUND,
      );
    }
    return examFound;
  }

  async getExamgroups() {
    return this.examgroupRepository.find({
      where: {
        annulled: false,
      },
      order: {
        position: 'ASC',
      },
    });
  }

  async getMaxPosition(): Promise<number> {
    const result = await this.examgroupRepository
      .createQueryBuilder('exam_group')
      .select('MAX(exam_group.position)', 'max')
      .getRawOne();

    return result.max || 0; 
  }

  async getExamgroupsList() {
    return this.examgroupRepository
      .createQueryBuilder('examgroup')
      .leftJoinAndSelect('examgroup.examlists', 'examlists')
      .orderBy('examgroup.position', 'ASC')
      .addOrderBy('examlists.position', 'ASC')
      .getMany();
  }

  async getExamgroupsViewList() {
    return this.examgroupRepository
      .createQueryBuilder('examgroup')
      .leftJoinAndSelect('examgroup.examlists', 'examlists')
      .where('examgroup.annulled=false')
      .andWhere('examlists.annulled=false')
      .orderBy('examgroup.position', 'ASC')
      .addOrderBy('examlists.description', 'ASC')
      .getMany();
  }

  async getExamgroupstodos() {
    return this.examgroupRepository.find({
      order: {
        position: 'ASC',
      },
    });
  }

  async updateExamgroup(id: number, examgroupLists: UpdateExamgroupDto) {
    const examListFound = await this.examgroupRepository.findOne({
      where: {
        id,
      },
    });
    if (!examListFound) {
      return new HttpException(
        'Grupo de examen no encontrado',
        HttpStatus.NOT_FOUND,
      );
    }
    const updateExam = Object.assign(examListFound, examgroupLists);
    return this.examgroupRepository.save(updateExam);
  }
}
