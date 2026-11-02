import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { SecurityAuditService } from '../audit/security-audit.service';
import { CreateDollarvalueDto } from './dto/create-dollarvalue.dto';
import { Dollarvalue } from './dollarvalue.entity';

@Injectable()
export class DollarvalueService {
  constructor(@InjectRepository(Dollarvalue) private readonly repository: Repository<Dollarvalue>, private readonly dataSource: DataSource, private readonly audit: SecurityAuditService) {}
  async getCurrent(laboratoryId: number): Promise<Dollarvalue> { this.id(laboratoryId); const record=await this.repository.findOne({where:{laboratoryId},order:{id:'DESC'}}); if(!record) throw new NotFoundException('DOLLAR_VALUE_NOT_FOUND'); return record; }
  getHistory(laboratoryId: number): Promise<Dollarvalue[]> { this.id(laboratoryId); return this.repository.find({where:{laboratoryId},order:{id:'DESC'},take:100}); }
  async publish(laboratoryId:number,body:CreateDollarvalueDto,actorUserId?:number):Promise<Dollarvalue>{this.id(laboratoryId);const value=this.normalizeValue(body);if(actorUserId===undefined)throw new BadRequestException('DOLLAR_VALUE_ACTOR_REQUIRED');return this.dataSource.transaction(async manager=>{const repository=manager.getRepository(Dollarvalue);const previous=await repository.findOne({where:{laboratoryId},order:{id:'DESC'}});const saved=await repository.save(repository.create({laboratoryId,value,date:this.caracasDate(),registeredAt:new Date(),source: 'UNKNOWN', updateMethod: 'MANUAL'}));await this.writeAudit(manager,actorUserId,laboratoryId,previous,saved);return saved});}
  private id(value:number){if(!Number.isInteger(value)||value<=0)throw new BadRequestException('LABORATORY_ID_INVALID')}
  private normalizeValue(body:CreateDollarvalueDto):number{if(!body||typeof body!=='object'||Array.isArray(body))throw new BadRequestException('DOLLAR_VALUE_BODY_REQUIRED');if(Object.keys(body).some(field => field !== 'value'))throw new BadRequestException('DOLLAR_VALUE_FIELD_UNKNOWN');const value=Number(body.value);if(!Number.isFinite(value)||value<=0)throw new BadRequestException('DOLLAR_VALUE_INVALID');const rounded=Math.round((value+Number.EPSILON)*1_000_000)/1_000_000;if(Math.abs(value-rounded)>Number.EPSILON)throw new BadRequestException('DOLLAR_VALUE_SCALE_INVALID');return rounded}
  private caracasDate():string{const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Caracas',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());const get=(type:string)=>parts.find(part=>part.type===type)?.value??'';return get('year')+'-'+get('month')+'-'+get('day')}
  private async writeAudit(manager:EntityManager,actorUserId:number,laboratoryId:number,previous:Dollarvalue|null,current:Dollarvalue){await this.audit.write(manager,{actorUserId,action:'dollar-value.published',entityType:'dollar-value',entityId:current.id,summary:'Valor del dolar publicado',metadata:{laboratoryId,previousValue:previous?.value??null,previousDate: previous?.date ?? null, currentValue: current.value, currentDate: current.date,source:current.source,updateMethod:current.updateMethod}})}
}
