import { BadRequestException } from '@nestjs/common';

export interface ValidatedExamFormatVue { format: Record<string, unknown> | null; size: number; }

const allowedTypes = new Set(['label', 'description', 'variable', 'units', 'vr']);
const allowedAlignments = new Set(['left', 'center', 'right']);

export function validateExamFormatVue(value: unknown): ValidatedExamFormatVue {
  if (value === null) return { format: null, size: 1 };
  if (!isRecord(value) || !Array.isArray(value.rowContainer)) invalid();
  if (value.rowContainer.length > 100) invalid('EXAM_CATALOG_FORMAT_TOO_LARGE');
  const rows = value.rowContainer.map(validateRow);
  const format = { rowCount: rows.length, rowContainer: rows };
  if (JSON.stringify(format).length > 250000) invalid('EXAM_CATALOG_FORMAT_TOO_LARGE');
  return { format, size: Math.max(1, rows.length) };
}

function validateRow(value: unknown): Record<string, unknown> {
  if (!isRecord(value)) invalid();
  const title = optionalText(value.rowTitle, 60);
  const antibiograma = value.antibiograma === true;
  const style = isRecord(value.style) ? value.style : {};
  const columns = isRecord(value.content) && Array.isArray(value.content.stageColumns) ? value.content.stageColumns : [];
  if (antibiograma && columns.length !== 0) invalid();
  if (!antibiograma && (columns.length < 1 || columns.length > 12)) invalid();
  const validatedColumns = columns.map(validateColumn);
  if (!antibiograma && validatedColumns.reduce((total, column) => total + Number(column.col), 0) !== 12) invalid();
  return {
    rowTitle: title,
    style: {
      paddingTop: pixel(style.paddingTop),
      paddingRight: pixel(style.paddingRight),
      paddingBottom: pixel(style.paddingBottom),
      paddingLeft: pixel(style.paddingLeft),
    },
    antibiograma,
    content: { stageColumns: validatedColumns },
  };
}

function validateColumn(value: unknown): Record<string, unknown> {
  if (!isRecord(value)) invalid();
  const span = Number(value.col);
  if (!Number.isInteger(span) || span < 1 || span > 12) invalid();
  const style = isRecord(value.style) ? value.style : {};
  const alignment = allowedAlignments.has(String(style.textAlign)) ? String(style.textAlign) : 'left';
  if (!Array.isArray(value.content) || value.content.length !== 1) invalid();
  return { col: span, style: { textAlign: alignment }, content: [validateContent(value.content[0])] };
}

function validateContent(value: unknown): Record<string, unknown> {
  if (!isRecord(value) || !allowedTypes.has(String(value.type))) invalid();
  const type = String(value.type);
  const numeric = value.numeric === true;
  const isFormula = value.isFormula === true;
  const autocompletion = value.autocompletion === true;
  const allowDecimal = value.allowDecimal === true;
  const decimalLimit = Number(value.decimalLimit ?? 0);
  if (!Number.isInteger(decimalLimit) || decimalLimit < 0 || decimalLimit > 6) invalid();
  const options = Array.isArray(value.autocompletionList) ? value.autocompletionList : [];
  if (options.length > 100) invalid('EXAM_CATALOG_FORMAT_TOO_LARGE');
  return {
    type,
    text: optionalText(value.text, 10000),
    value: optionalText(value.value, 500),
    numeric,
    isFormula,
    formula: optionalText(value.formula, 1000),
    allowDecimal,
    decimalLimit: allowDecimal ? decimalLimit : 0,
    autocompletion,
    autocompletionList: options.map((option) => {
      if (!isRecord(option)) invalid();
      return { text: requiredText(option.text, 200) };
    }),
  };
}

function pixel(value: unknown): string {
  const number = Number.parseInt(String(value ?? '0').replace('px', ''), 10);
  if (!Number.isInteger(number) || number < 0 || number > 60) invalid();
  return `${number}px`;
}
function requiredText(value: unknown, maximum: number): string {
  if (typeof value !== 'string' || value.trim() === '' || value.length > maximum) invalid();
  return value;
}
function optionalText(value: unknown, maximum: number): string {
  if (value === undefined || value === null) return '';
  if (typeof value !== 'string' || value.length > maximum) invalid();
  return value;
}
function isRecord(value: unknown): value is Record<string, any> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
function invalid(code = 'EXAM_CATALOG_FORMAT_INVALID'): never {
  throw new BadRequestException(code);
}
