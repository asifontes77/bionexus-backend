import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Examlists } from './examlists.entity';
import { Like, Repository } from 'typeorm';
import { CreateExam_listDto } from './dto/create-exam_lists.dto';
import { UpdateExam_listDto } from './dto/update-exam_lists.dto';

@Injectable()
export class ExamListsService {
  constructor(
    @InjectRepository(Examlists)
    private examListRepository: Repository<Examlists>,
  ) {}

  async getExamLists() {
    return this.examListRepository.find();
  }

  async createExamList(examLists: CreateExam_listDto) {
    const { group_id } = examLists;
    const maxPosition = await this.getMaxPosition(group_id);
    const nextPosition = maxPosition + 1;
    const newExam = this.examListRepository.create({
      ...examLists,
      position: nextPosition,
    });
    return this.examListRepository.save(newExam);
  }
  
  async getMaxPosition(groupId: number): Promise<number> {
    const result = await this.examListRepository
      .createQueryBuilder('exam_lists')
      .select('MAX(exam_lists.position)', 'max')
      .where('exam_lists.group_id = :groupId', { groupId })
      .getRawOne();

    return result.max || 0; 
  }

  async getExamList(id: number) {
    const examListFound = this.examListRepository.findOne({
      where: {
        id,
      },
    });
    if (!examListFound) {
      return new HttpException('examen no encontrado', HttpStatus.NOT_FOUND);
    }
    return examListFound;
  }

  async getExamByGroup(id: number) {
    const examListFound = this.examListRepository.find({
      where: {
        group_id: id,
      },
      order: {
        description: 'ASC',
      },
    });
    if (!examListFound) {
      return new HttpException('examen no encontrado', HttpStatus.NOT_FOUND);
    }
    return examListFound;
  }

  async getExamByGroupAnulled(id: number) {
    const examListFound = this.examListRepository.find({
      where: {
        group_id: id,
        annulled: false,
      },
      order: {
        description: 'ASC',
      },
    });
    if (!examListFound) {
      return new HttpException('examen no encontrado', HttpStatus.NOT_FOUND);
    }
    return examListFound;
  }

  async getExamListByDescription(description: string) {
    return this.examListRepository.find({
      where: {
        description: Like(`%${description}%`),
      },
    });
  }

  async updateExamList(id: number, examLists: UpdateExam_listDto) {
    const examListFound = await this.examListRepository.findOne({
      where: {
        id,
      },
    });
    if (!examListFound) {
      return new HttpException('exam no encontrado', HttpStatus.NOT_FOUND);
    }
    const updateExam = Object.assign(examListFound, examLists);
    return this.examListRepository.save(updateExam);
  }
}
