import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Waypay } from './waypay.entity';
import { Repository } from 'typeorm';
import { CreateWaypayDto } from './dto/create-waypay.dto';
import { UpdateWaypayDto } from './dto/update-waypay.dto';

@Injectable()
export class WaypayService {
  constructor(
    @InjectRepository(Waypay) private waypayRepository: Repository<Waypay>,
  ) {}

  async getWaypayDate(admission: Date) {
    return this.waypayRepository.find({
      where: {
        date: admission,
      },
      relations: {
        waypayitems: true,
      },
    });
  }

  async getWaypayPatientId(id: number) {
    const waypayFound = this.waypayRepository.findOne({
      where: {
        id_patients: id,
      },
      relations: {
        waypayitems: true,
      },
    });
    if (!waypayFound) {
      return new HttpException(
        'forma de pago no encontrado',
        HttpStatus.NOT_FOUND,
      );
    }
    return waypayFound;
  }

  async createWaypay(waypay: CreateWaypayDto): Promise<any> {
    return this.waypayRepository.save(waypay);
  }

  async updateWaypay(id: number, waypay: UpdateWaypayDto) {
    const waypayFound = await this.waypayRepository.findOne({
      where: {
        id,
      },
    });
    if (!waypayFound) {
      return new HttpException(
        'forma de pago no encontrado',
        HttpStatus.NOT_FOUND,
      );
    }
    const updateWaypay = Object.assign(waypayFound, waypay);
    return this.waypayRepository.save(updateWaypay);
  }

  async getInvoiceTotales(admission: Date, idUser: number, idTypePay: number) {
    const totales = await this.waypayRepository
      .createQueryBuilder('way_pay')
      .select([
        'COALESCE(SUM(CASE WHEN way_pay.annulment = false THEN way_pay_items.amount ELSE 0 END), 0) AS total_not_annulled',
        'COALESCE(SUM(CASE WHEN way_pay.annulment = true THEN way_pay_items.amount ELSE 0 END), 0) AS total_annulled',
        'COALESCE(SUM(CASE WHEN way_pay.annulment = false THEN way_pay_items.amountDollar ELSE 0 END), 0) AS total_dollars_not_annulled',
        'COALESCE(SUM(CASE WHEN way_pay.annulment = true THEN way_pay_items.amountDollar ELSE 0 END), 0) AS total_dollars_annulled',
      ])
      .innerJoin('way_pay.waypayitems', 'way_pay_items')
      .where('DATE(way_pay.date) = :admission', { admission })
      .andWhere('way_pay.id_users = :idUser', { idUser })
      .andWhere('way_pay_items.id_type_payment = :idTypePay', { idTypePay })
      .getRawOne();
    return totales;
  }
}
