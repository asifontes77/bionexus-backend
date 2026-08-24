import { BadRequestException } from '@nestjs/common';
import { validateExamFormatVue } from './exam-format-vue.validator';

const content = { type: 'variable', text: '<p>{{variable_1}}</p>', value: '{{variable_1}}', numeric: true, isFormula: false, formula: '', allowDecimal: true, decimalLimit: 2, autocompletion: false, autocompletionList: [] };
const valid = { rowCount: 99, rowContainer: [{ rowTitle: 'Resultado', style: { paddingTop: '0px', paddingRight: '0px', paddingBottom: '0px', paddingLeft: '0px' }, antibiograma: false, content: { stageColumns: [{ col: 12, style: { textAlign: 'left' }, content: [content] }] } }] };

describe('validateExamFormatVue', () => {
  it('normaliza formato valido y calcula size en Backend', () => {
    expect(validateExamFormatVue(valid)).toEqual({ format: { rowCount: 1, rowContainer: valid.rowContainer }, size: 1 });
  });
  it('admite null sin confiar en size del cliente', () => {
    expect(validateExamFormatVue(null)).toEqual({ format: null, size: 1 });
  });
  it.each([undefined, {}, { rowContainer: 'x' }, { rowContainer: [{ antibiograma: false, content: { stageColumns: [] } }] }])('rechaza formato malformado', (value) => {
    expect(() => validateExamFormatVue(value)).toThrow(BadRequestException);
  });
  it('rechaza mas de cien filas', () => {
    expect(() => validateExamFormatVue({ rowContainer: Array.from({ length: 101 }, () => valid.rowContainer[0]) })).toThrow('EXAM_CATALOG_FORMAT_TOO_LARGE');
  });
  it('rechaza columnas cuyos spans no suman doce', () => {
    const malformed = structuredClone(valid); malformed.rowContainer[0].content.stageColumns[0].col = 11;
    expect(() => validateExamFormatVue(malformed)).toThrow('EXAM_CATALOG_FORMAT_INVALID');
  });
});
