import { Injectable } from '@nestjs/common';

export interface DollarvalueFetchResult { value: number; effectiveDate: string; source: 'BCV' | 'DOLAR_API'; }

@Injectable()
export class DollarvalueSourceService {
  async fetch(bcvUrl: string, fallbackUrl: string): Promise<DollarvalueFetchResult> {
    try { return await this.fetchBcv(bcvUrl); }
    catch { return this.fetchFallback(fallbackUrl); }
  }

  private async fetchBcv(url: string): Promise<DollarvalueFetchResult> {
    const html = await this.getText(url, 'text/html');
    const block = html.match(/id=["']dolar["'][\s\S]{0,2500}?<strong[^>]*>([\s\S]*?)<\/strong>/i)?.[1];
    const dateText = html.match(/class=["'][^"']*date-display-single[^"']*["'][^>]*>([\s\S]*?)<\/span>/i)?.[1];
    const value = this.parsePositive(block);
    const effectiveDate = this.parseDate(this.clean(dateText));
    if (!value || !effectiveDate) throw new Error('BCV_RESPONSE_INVALID');
    return { value, effectiveDate, source: 'BCV' };
  }

  private async fetchFallback(url: string): Promise<DollarvalueFetchResult> {
    const response = await this.get(url, 'application/json');
    const body = await response.json() as { venta?: unknown; fechaActualizacion?: unknown };
    const value = this.parsePositive(body.venta);
    const effectiveDate = this.parseDate(String(body.fechaActualizacion ?? '')) ?? this.caracasDate();
    if (!value) throw new Error('DOLLAR_API_RESPONSE_INVALID');
    return { value, effectiveDate, source: 'DOLAR_API' };
  }

  private async getText(url: string, accept: string): Promise<string> { return (await this.get(url, accept)).text(); }
  private async get(url: string, accept: string): Promise<Response> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);
    try {
      const response = await fetch(url, { headers: { accept, 'user-agent': 'BioNexus-ExchangeRate/1.0' }, signal: controller.signal });
      if (!response.ok) throw new Error('HTTP_' + response.status);
      return response;
    } finally { clearTimeout(timeout); }
  }

  private clean(value: unknown): string { return String(value ?? '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/gi, ' ').replace(/\s+/g, ' ').trim(); }
  private parsePositive(value: unknown): number | null {
    const raw = this.clean(value).match(/\d[\d.,\s]*/)?.[0]?.replace(/\s/g, '');
    if (!raw) return null;
    const comma = raw.lastIndexOf(','), dot = raw.lastIndexOf('.');
    let normalized = raw;
    if (comma >= 0 && dot >= 0) normalized = comma > dot ? raw.replace(/\./g, '').replace(',', '.') : raw.replace(/,/g, '');
    else if (comma >= 0) normalized = raw.replace(',', '.');
    const parsed = Number(normalized);
    return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed * 100) / 100 : null;
  }
  private parseDate(value: string): string | null {
    if (!value) return null;
    const numeric = value.match(/(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})/);
    if (numeric) return numeric[3] + '-' + numeric[2].padStart(2, '0') + '-' + numeric[1].padStart(2, '0');
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString().slice(0, 10);
  }
  private caracasDate(): string { return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Caracas', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date()); }
}
