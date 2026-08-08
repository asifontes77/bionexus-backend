import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateParasiticformsDto } from './dto/create-parasiticforms.dto';
import { UpdateParasiticformsDto } from './dto/update-parasiticforms.dto';
import { Parasiticforms } from './parasiticforms.entity';

@Injectable()
export class ParasiticformsService {
  constructor(
    @InjectRepository(Parasiticforms)
    private readonly parasiticformsRepository: Repository<Parasiticforms>,
  ) {}

  async getParasiticformsLists(): Promise<Parasiticforms[]> {
    return this.parasiticformsRepository.find({
      order: {
        description: 'ASC',
      },
    });
  }

  async getParasiticformsListsOrder(): Promise<Parasiticforms[]> {
    return this.parasiticformsRepository.find({
      where: {
        annulled: false,
      },
      order: {
        description: 'ASC',
      },
    });
  }

  async getParasiticforms(id: number): Promise<Parasiticforms> {
    this.validateId(id);

    const parasiticform = await this.parasiticformsRepository.findOne({
      where: {
        id,
      },
    });

    if (!parasiticform) {
      throw new NotFoundException('PARASITICFORM_NOT_FOUND');
    }

    return parasiticform;
  }

  async createParasiticforms(
    body: CreateParasiticformsDto,
  ): Promise<Parasiticforms> {
    const description = this.normalizeDescription(body?.description);

    const parasiticform = this.parasiticformsRepository.create({
      description,
      annulled: false,
    });

    return this.parasiticformsRepository.save(parasiticform);
  }

  async updateParasiticforms(
    id: number,
    body: UpdateParasiticformsDto,
  ): Promise<Parasiticforms> {
    this.validateId(id);

    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      throw new BadRequestException('PARASITICFORM_UPDATE_REQUIRED');
    }

    const hasDescription = Object.prototype.hasOwnProperty.call(
      body,
      'description',
    );

    const hasAnnulled = Object.prototype.hasOwnProperty.call(body, 'annulled');

    if (!hasDescription && !hasAnnulled) {
      throw new BadRequestException('PARASITICFORM_UPDATE_REQUIRED');
    }

    const parasiticform = await this.parasiticformsRepository.findOne({
      where: {
        id,
      },
    });

    if (!parasiticform) {
      throw new NotFoundException('PARASITICFORM_NOT_FOUND');
    }

    if (hasDescription) {
      parasiticform.description = this.normalizeDescription(body.description);
    }

    if (hasAnnulled) {
      if (typeof body.annulled !== 'boolean') {
        throw new BadRequestException('PARASITICFORM_ANNULLED_INVALID');
      }

      parasiticform.annulled = body.annulled;
    }

    return this.parasiticformsRepository.save(parasiticform);
  }

  private validateId(id: number): void {
    if (!Number.isInteger(id) || id <= 0) {
      throw new BadRequestException('PARASITICFORM_ID_INVALID');
    }
  }

  private normalizeDescription(description: unknown): string {
    if (typeof description !== 'string') {
      throw new BadRequestException('PARASITICFORM_DESCRIPTION_REQUIRED');
    }

    const normalizedDescription = description.trim();

    if (normalizedDescription === '') {
      throw new BadRequestException('PARASITICFORM_DESCRIPTION_REQUIRED');
    }

    if (normalizedDescription.length > 50) {
      throw new BadRequestException('PARASITICFORM_DESCRIPTION_TOO_LONG');
    }

    return normalizedDescription;
  }
}
