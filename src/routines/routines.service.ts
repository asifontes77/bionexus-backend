import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Routines } from './routines.entity';
import { Repository, Like } from 'typeorm';
import { CreateRoutinesDto } from './dto/create-routines.dto';
import { UpdateRoutinesDto } from './dto/update-routines.dto';

@Injectable()
export class RoutinesService {
  constructor(
    @InjectRepository(Routines)
    private routinesRepository: Repository<Routines>,
  ) {}

  async getRoutines(id: number) {
    const routinesFound = this.routinesRepository.findOne({
      where: {
        id,
      },
    });
    if (!routinesFound) {
      return new HttpException('Rutina no encontrada', HttpStatus.NOT_FOUND);
    }
    return routinesFound;
  }

  async getRoutinesList() {
    return this.routinesRepository.find();
  }

  async createRoutines(routines: CreateRoutinesDto): Promise<any> {
    return this.routinesRepository.save(routines);
  }

  async updateRoutines(id: number, routine: UpdateRoutinesDto) {
    const routineFound = await this.routinesRepository.findOne({
      where: {
        id,
      },
    });
    if (!routineFound) {
      return new HttpException('rutina no encontrado', HttpStatus.NOT_FOUND);
    }
    const updateRoutine = Object.assign(routineFound, routine);
    return this.routinesRepository.save(updateRoutine);
  }

  async deleteRoutines(id: number) {
    const routineFound = await this.routinesRepository.findOne({
      where: {
        id,
      },
    });
    if (!routineFound) {
      return new HttpException('Rutina no encontrado', HttpStatus.NOT_FOUND);
    }
    await this.routinesRepository.remove(routineFound);
    return true;
  }

  async countWithLike(description: string) {
    return this.routinesRepository.count({
      where: {
        description: Like(`%${description}%`),
      },
    });
  }
}
