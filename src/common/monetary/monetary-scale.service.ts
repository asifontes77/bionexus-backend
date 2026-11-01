import { BadRequestException, Injectable } from '@nestjs/common';
@Injectable()
export class MonetaryScaleService {
  static readonly STORAGE_FACTOR = 100;
  static readonly STORAGE_TOLERANCE = 0.01;
  roundAmount(value: number): number { const amount=Number(value); if(!Number.isFinite(amount)) throw new BadRequestException('MONETARY_AMOUNT_INVALID'); return Math.round((amount+Number.EPSILON)*MonetaryScaleService.STORAGE_FACTOR)/MonetaryScaleService.STORAGE_FACTOR; }
  tolerance(): number { return MonetaryScaleService.STORAGE_TOLERANCE; }
}
