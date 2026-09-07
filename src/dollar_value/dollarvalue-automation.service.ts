import { BadRequestException, Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { SecurityAuditService } from '../audit/security-audit.service';
import { DollarvalueAutomationRun } from './dollarvalue-automation-run.entity';
import { DollarvalueAutomation } from './dollarvalue-automation.entity';
import { DollarvalueSourceService } from './dollarvalue-source.service';
import { Dollarvalue } from './dollarvalue.entity';

@Injectable()
export class DollarvalueAutomationService implements OnModuleInit, OnModuleDestroy {
  private timer?: NodeJS.Timeout;
  private running = false;
  private lastScheduledDate: string | null = null;
  constructor(@InjectRepository(DollarvalueAutomation) private readonly configRepo: Repository<DollarvalueAutomation>, @InjectRepository(DollarvalueAutomationRun) private readonly runRepo: Repository<DollarvalueAutomationRun>, private readonly dataSource: DataSource, private readonly source: DollarvalueSourceService, private readonly audit: SecurityAuditService) {}
  onModuleInit(): void { this.timer = setInterval(() => void this.tick(), 60000); this.timer.unref(); void this.tick(); }
  onModuleDestroy(): void { if (this.timer) clearInterval(this.timer); }
  async getConfig(): Promise<DollarvalueAutomation> { return this.ensureConfig(); }
  async updateConfig(body: Record<string, unknown>, actorUserId: number): Promise<DollarvalueAutomation> {
    if (!Number.isInteger(actorUserId) || actorUserId <= 0) throw new BadRequestException('DOLLAR_AUTOMATION_ACTOR_REQUIRED');
    const allowed = ['enabled', 'run_time']; if (Object.keys(body ?? {}).some((x) => !allowed.includes(x))) throw new BadRequestException('DOLLAR_AUTOMATION_FIELD_UNKNOWN');
    const config = await this.ensureConfig();
    if (body.enabled !== undefined && typeof body.enabled !== 'boolean') throw new BadRequestException('DOLLAR_AUTOMATION_ENABLED_INVALID');
    if (body.run_time !== undefined && (typeof body.run_time !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(body.run_time))) throw new BadRequestException('DOLLAR_AUTOMATION_TIME_INVALID');
    Object.assign(config, body); return this.configRepo.save(config);
  }
  async executeNow(actorUserId: number): Promise<Record<string, unknown>> { if (!Number.isInteger(actorUserId) || actorUserId <= 0) throw new BadRequestException('DOLLAR_AUTOMATION_ACTOR_REQUIRED'); return this.execute(actorUserId); }
  private async tick(): Promise<void> {
    const config = await this.ensureConfig(); if (!config.enabled || this.running) return;
    const parts = new Intl.DateTimeFormat('en-CA', { timeZone: config.time_zone, weekday: 'short', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(new Date());
    const get = (type: string) => parts.find((x) => x.type === type)?.value ?? '';
    const day = get('year') + '-' + get('month') + '-' + get('day'), weekday = get('weekday'), time = get('hour') + ':' + get('minute');
    if (['Sat', 'Sun'].includes(weekday) || time !== config.run_time || this.lastScheduledDate === day) return;
    this.lastScheduledDate = day; await this.execute(null);
  }
  private async execute(actorUserId: number | null): Promise<Record<string, unknown>> {
    if (this.running) return { status: 'BUSY' }; this.running = true;
    const config = await this.ensureConfig(); const run = await this.runRepo.save(this.runRepo.create({ started_at: new Date(), finished_at: null, status: 'RUNNING', source: null, value: null, effective_date: null, error: null, requested_by_user_id: actorUserId }));
    config.last_started_at = run.started_at; config.last_status = 'RUNNING'; config.last_error = null; await this.configRepo.save(config);
    try {
      const fetched = await this.source.fetch(config.bcv_url, config.fallback_url);
      const result = await this.dataSource.transaction(async (manager) => {
        const repository = manager.getRepository(Dollarvalue); const previous = await repository.findOne({ where: {}, order: { id: 'DESC' } });
        if (previous && Number(previous.value) === fetched.value) return { status: 'UNCHANGED', record: previous };
        const saved = await repository.save(repository.create({ value: fetched.value, date: new Date(fetched.effectiveDate + 'T12:00:00-04:00') }));
        if (actorUserId) await this.audit.write(manager, { actorUserId, action: 'dollar-value.automatic-published', entityType: 'dollar-value', entityId: saved.id, summary: 'Valor del dolar actualizado automaticamente', metadata: { source: fetched.source, effectiveDate: fetched.effectiveDate, previousValue: previous?.value ?? null, currentValue: saved.value } });
        return { status: 'INSERTED', record: saved };
      });
      Object.assign(run, { finished_at: new Date(), status: result.status, source: fetched.source, value: fetched.value, effective_date: fetched.effectiveDate });
      Object.assign(config, { last_finished_at: run.finished_at, last_status: run.status, last_source: fetched.source, last_error: null }); await this.runRepo.save(run); await this.configRepo.save(config);
      return { status: result.status, source: fetched.source, value: fetched.value, effectiveDate: fetched.effectiveDate, record: result.record };
    } catch (error) {
      const message = error instanceof Error ? error.message.slice(0, 500) : 'DOLLAR_AUTOMATION_FAILED'; Object.assign(run, { finished_at: new Date(), status: 'FAILED', error: message }); Object.assign(config, { last_finished_at: run.finished_at, last_status: 'FAILED', last_error: message }); await this.runRepo.save(run); await this.configRepo.save(config); return { status: 'FAILED', error: message };
    } finally { this.running = false; }
  }
  private async ensureConfig(): Promise<DollarvalueAutomation> { return (await this.configRepo.findOne({ where: { id: 1 } })) ?? this.configRepo.save(this.configRepo.create({ id: 1, enabled: false, run_time: '18:00', time_zone: 'America/Caracas', bcv_url: 'https://www.bcv.org.ve/', fallback_url: 'https://ve.dolarapi.com/v1/dolares/oficial' })); }
}
